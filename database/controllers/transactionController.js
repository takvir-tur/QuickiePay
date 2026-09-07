const pool = require('../db_connection');
const bcrypt = require('bcryptjs');

async function sendMoney(req, res) {
  // sender_id comes from your JWT verifyToken middleware
  const senderUserId = req.user.user_id; 
  const { receiver_phone, amount, pin, note } = req.body;

  if (amount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0' });
  }

  try {
    // 1. Get Sender Info & Verify PIN
    const senderResult = await pool.query(`
      SELECT u.pin_hash, a.account_id 
      FROM users u
      JOIN accounts a ON u.user_id = a.user_id
      WHERE u.user_id = $1
    `, [senderUserId]);
    
    const sender = senderResult.rows[0];
    const isPinValid = await bcrypt.compare(pin, sender.pin_hash);
    if (!isPinValid) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    // 2. Get Receiver Info
    const receiverResult = await pool.query(`
      SELECT a.account_id 
      FROM users u
      JOIN accounts a ON u.user_id = a.user_id
      WHERE u.phone_number = $1
    `, [receiver_phone]);

    if (receiverResult.rows.length === 0) {
      return res.status(404).json({ error: 'Receiver not found' });
    }

    const receiverAccountId = receiverResult.rows[0].account_id;
    const senderAccountId = sender.account_id;

    if (senderAccountId === receiverAccountId) {
      return res.status(400).json({ error: 'You cannot send money to yourself' });
    }

    // 3. Prevent Deadlocks: Sort Account IDs alphabetically
    const accountsToLock = [senderAccountId, receiverAccountId].sort();

    // ==========================================
    // START TRANSACTION
    // ==========================================
    await pool.query('BEGIN');

    // 4. Lock Rows in deterministic order
    await pool.query('SELECT balance FROM accounts WHERE account_id = $1 FOR UPDATE', [accountsToLock[0]]);
    await pool.query('SELECT balance FROM accounts WHERE account_id = $1 FOR UPDATE', [accountsToLock[1]]);

    // 5. Check Sender's Exact Balance AFTER securing the lock
    const balanceCheck = await pool.query('SELECT balance FROM accounts WHERE account_id = $1', [senderAccountId]);
    if (parseFloat(balanceCheck.rows[0].balance) < amount) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // 6. Execute Atomic Updates
    await pool.query('UPDATE accounts SET balance = balance - $1 WHERE account_id = $2', [amount, senderAccountId]);
    await pool.query('UPDATE accounts SET balance = balance + $1 WHERE account_id = $2', [amount, receiverAccountId]);

    // 7. Record the Transaction[cite: 2]
    const referenceNo = `TXN${Date.now()}`;
    await pool.query(`
      INSERT INTO transactions (reference_no, transaction_type, sender_account_id, receiver_account_id, amount, transaction_status, remarks)
      VALUES ($1, 'SEND_MONEY', $2, $3, $4, 'SUCCESS', $5)
    `, [referenceNo, senderAccountId, receiverAccountId, amount, note || null]);

    await pool.query('COMMIT');

    res.status(200).json({ message: 'Money sent successfully', referenceNo, amount });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Send Money Error:', err.message);
    res.status(500).json({ error: 'Transaction failed' });
  }
}

// =====================================================
// CASH IN
// Agent gives digital money to customer
// Customer balance + amount
// Agent balance - amount
// Commission = 0
// =====================================================

async function cashIn(req, res) {
  const agentUserId = req.user.user_id;

  const {
    customer_phone,
    amount,
    pin,
    note
  } = req.body;

  if (!customer_phone || !amount || !pin) {
    return res.status(400).json({
      error: 'Customer phone, amount and PIN are required'
    });
  }

  const numericAmount = parseFloat(amount);

  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({
      error: 'Amount must be greater than 0'
    });
  }

  try {

    // -------------------------------------------------
    // 1. Verify that logged-in user is an AGENT
    // -------------------------------------------------

    const agentResult = await pool.query(`
      SELECT
        u.pin_hash,
        a.account_id AS agent_account_id,
        ag.agent_id,
        ag.status
      FROM users u
      JOIN accounts a
        ON u.user_id = a.user_id
      JOIN agents ag
        ON u.user_id = ag.user_id
      WHERE u.user_id = $1
    `, [agentUserId]);

    if (agentResult.rows.length === 0) {
      return res.status(403).json({
        error: 'You are not registered as an agent'
      });
    }

    const agent = agentResult.rows[0];

    if (agent.status !== 'ACTIVE') {
      return res.status(403).json({
        error: 'Agent account is not active'
      });
    }

    // -------------------------------------------------
    // 2. Verify Agent PIN
    // -------------------------------------------------

    const isPinValid = await bcrypt.compare(
      pin,
      agent.pin_hash
    );

    if (!isPinValid) {
      return res.status(401).json({
        error: 'Invalid PIN'
      });
    }

    // -------------------------------------------------
    // 3. Find Customer
    // -------------------------------------------------

    const customerResult = await pool.query(`
      SELECT
        u.user_id,
        u.full_name,
        a.account_id,
        a.balance
      FROM users u
      JOIN accounts a
        ON u.user_id = a.user_id
      WHERE u.phone_number = $1
        AND a.account_type = 'PERSONAL'
    `, [customer_phone]);

    if (customerResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Customer not found'
      });
    }

    const customer = customerResult.rows[0];

    if (customer.account_id === agent.agent_account_id) {
      return res.status(400).json({
        error: 'You cannot cash in to your own account'
      });
    }

    // -------------------------------------------------
    // 4. Start DB Transaction
    // -------------------------------------------------

    await pool.query('BEGIN');

    // Lock both accounts
    const accountsToLock = [
      agent.agent_account_id,
      customer.account_id
    ].sort();

    await pool.query(
      `SELECT balance
       FROM accounts
       WHERE account_id = $1
       FOR UPDATE`,
      [accountsToLock[0]]
    );

    await pool.query(
      `SELECT balance
       FROM accounts
       WHERE account_id = $1
       FOR UPDATE`,
      [accountsToLock[1]]
    );

    // -------------------------------------------------
    // 5. Check Agent Balance
    // -------------------------------------------------

    const balanceResult = await pool.query(`
      SELECT balance
      FROM accounts
      WHERE account_id = $1
    `, [agent.agent_account_id]);

    const agentBalance =
      parseFloat(balanceResult.rows[0].balance);

    if (agentBalance < numericAmount) {
      await pool.query('ROLLBACK');

      return res.status(400).json({
        error: 'Insufficient agent balance'
      });
    }

    // -------------------------------------------------
    // 6. Transfer Money
    // -------------------------------------------------

    // Agent balance decreases
    await pool.query(`
      UPDATE accounts
      SET balance = balance - $1
      WHERE account_id = $2
    `, [
      numericAmount,
      agent.agent_account_id
    ]);

    // Customer balance increases
    await pool.query(`
      UPDATE accounts
      SET balance = balance + $1
      WHERE account_id = $2
    `, [
      numericAmount,
      customer.account_id
    ]);

    // -------------------------------------------------
    // 7. Create Main Transaction
    // -------------------------------------------------

    const referenceNo = `CIN${Date.now()}`;

    const transactionResult = await pool.query(`
      INSERT INTO transactions
      (
        reference_no,
        transaction_type,
        sender_account_id,
        receiver_account_id,
        amount,
        fee,
        transaction_status,
        remarks
      )
      VALUES
      (
        $1,
        'CASH_IN',
        $2,
        $3,
        $4,
        0,
        'SUCCESS',
        $5
      )
      RETURNING transaction_id
    `, [
      referenceNo,
      agent.agent_account_id,
      customer.account_id,
      numericAmount,
      note || null
    ]);

    const transactionId =
      transactionResult.rows[0].transaction_id;

    // -------------------------------------------------
    // 8. Create Cash Transaction Record
    // -------------------------------------------------

    await pool.query(`
      INSERT INTO cash_transactions
      (
        transaction_id,
        agent_id,
        cash_type,
        commission
      )
      VALUES
      (
        $1,
        $2,
        'CASH_IN',
        0
      )
    `, [
      transactionId,
      agent.agent_id
    ]);

    await pool.query('COMMIT');

    res.status(200).json({
      message: 'Cash In successful',
      referenceNo,
      customer: customer.full_name,
      amount: numericAmount,
      commission: 0
    });

  } catch (err) {

    await pool.query('ROLLBACK');

    console.error('Cash In Error:', err.message);

    res.status(500).json({
      error: 'Cash In transaction failed'
    });
  }
}


// =====================================================
// CASH OUT
// Customer gives digital money to agent
// Customer balance - (amount + commission)
// Agent balance + amount
// Agent earns commission
// =====================================================

async function cashOut(req, res) {
  const agentUserId = req.user.user_id;

  const {
    customer_phone,
    amount,
    pin,
    note
  } = req.body;

  if (!customer_phone || !amount || !pin) {
    return res.status(400).json({
      error: 'Customer phone, amount and PIN are required'
    });
  }

  const numericAmount = parseFloat(amount);

  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({
      error: 'Amount must be greater than 0'
    });
  }

  try {

    // -------------------------------------------------
    // 1. Get Agent + Commission Rate
    // -------------------------------------------------

    const agentResult = await pool.query(`
      SELECT
        u.pin_hash,
        a.account_id AS agent_account_id,
        ag.agent_id,
        ag.commission_rate,
        ag.status
      FROM users u
      JOIN accounts a
        ON u.user_id = a.user_id
      JOIN agents ag
        ON u.user_id = ag.user_id
      WHERE u.user_id = $1
    `, [agentUserId]);

    if (agentResult.rows.length === 0) {
      return res.status(403).json({
        error: 'You are not registered as an agent'
      });
    }

    const agent = agentResult.rows[0];

    if (agent.status !== 'ACTIVE') {
      return res.status(403).json({
        error: 'Agent account is not active'
      });
    }

    // -------------------------------------------------
    // 2. Verify Agent PIN
    // -------------------------------------------------

    const isPinValid = await bcrypt.compare(
      pin,
      agent.pin_hash
    );

    if (!isPinValid) {
      return res.status(401).json({
        error: 'Invalid PIN'
      });
    }

    // -------------------------------------------------
    // 3. Find Customer
    // -------------------------------------------------

    const customerResult = await pool.query(`
      SELECT
        u.user_id,
        u.full_name,
        a.account_id,
        a.balance
      FROM users u
      JOIN accounts a
        ON u.user_id = a.user_id
      WHERE u.phone_number = $1
        AND a.account_type = 'PERSONAL'
    `, [customer_phone]);

    if (customerResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Customer not found'
      });
    }

    const customer = customerResult.rows[0];

    if (customer.account_id === agent.agent_account_id) {
      return res.status(400).json({
        error: 'You cannot cash out from your own account'
      });
    }

    // -------------------------------------------------
    // 4. Calculate Commission
    // -------------------------------------------------

    const commissionRate =
      parseFloat(agent.commission_rate) || 0;

    const commission =
      numericAmount * commissionRate / 100;

    const totalDeduction =
      numericAmount + commission;

    // -------------------------------------------------
    // 5. Start Transaction
    // -------------------------------------------------

    await pool.query('BEGIN');

    // Lock both accounts
    const accountsToLock = [
      agent.agent_account_id,
      customer.account_id
    ].sort();

    await pool.query(
      `SELECT balance
       FROM accounts
       WHERE account_id = $1
       FOR UPDATE`,
      [accountsToLock[0]]
    );

    await pool.query(
      `SELECT balance
       FROM accounts
       WHERE account_id = $1
       FOR UPDATE`,
      [accountsToLock[1]]
    );

    // -------------------------------------------------
    // 6. Check Customer Balance
    // -------------------------------------------------

    const balanceResult = await pool.query(`
      SELECT balance
      FROM accounts
      WHERE account_id = $1
    `, [customer.account_id]);

    const customerBalance =
      parseFloat(balanceResult.rows[0].balance);

    if (customerBalance < totalDeduction) {
      await pool.query('ROLLBACK');

      return res.status(400).json({
        error: `Insufficient balance. Required: ৳${totalDeduction.toFixed(2)}`
      });
    }

    // -------------------------------------------------
    // 7. Customer Balance Decrease
    // Amount + Commission
    // -------------------------------------------------

    await pool.query(`
      UPDATE accounts
      SET balance = balance - $1
      WHERE account_id = $2
    `, [
      totalDeduction,
      customer.account_id
    ]);

    // -------------------------------------------------
    // 8. Agent Balance Increase
    // Only cash amount
    // -------------------------------------------------

    await pool.query(`
      UPDATE accounts
      SET balance = balance + $1
      WHERE account_id = $2
    `, [
      numericAmount,
      agent.agent_account_id
    ]);

    // -------------------------------------------------
    // 9. Main Transaction
    // -------------------------------------------------

    const referenceNo = `COUT${Date.now()}`;

    const transactionResult = await pool.query(`
      INSERT INTO transactions
      (
        reference_no,
        transaction_type,
        sender_account_id,
        receiver_account_id,
        amount,
        fee,
        transaction_status,
        remarks
      )
      VALUES
      (
        $1,
        'CASH_OUT',
        $2,
        $3,
        $4,
        $5,
        'SUCCESS',
        $6
      )
      RETURNING transaction_id
    `, [
      referenceNo,
      customer.account_id,
      agent.agent_account_id,
      numericAmount,
      commission,
      note || null
    ]);

    const transactionId =
      transactionResult.rows[0].transaction_id;

    // -------------------------------------------------
    // 10. Cash Transaction
    // -------------------------------------------------

    await pool.query(`
      INSERT INTO cash_transactions
      (
        transaction_id,
        agent_id,
        cash_type,
        commission
      )
      VALUES
      (
        $1,
        $2,
        'CASH_OUT',
        $3
      )
    `, [
      transactionId,
      agent.agent_id,
      commission
    ]);

    await pool.query('COMMIT');

    res.status(200).json({
      message: 'Cash Out successful',
      referenceNo,
      customer: customer.full_name,
      amount: numericAmount,
      commission: commission.toFixed(2),
      totalDeduction: totalDeduction.toFixed(2)
    });

  } catch (err) {

    await pool.query('ROLLBACK');

    console.error('Cash Out Error:', err.message);

    res.status(500).json({
      error: 'Cash Out transaction failed'
    });
  }
}


async function getTransactionHistory(req, res) {
  const userId = req.user.user_id; // From verifyToken middleware

  try {
    // This query grabs the user's account_id, then finds all transactions where 
    // they are either the sender OR the receiver, dynamically labeling it.
    const result = await pool.query(`
      SELECT 
        t.reference_no AS id,
        CASE 
          WHEN t.receiver_account_id = (SELECT account_id FROM accounts WHERE user_id = $1) THEN 'RECEIVED'
          ELSE t.transaction_type::text 
        END AS type,
        u.full_name AS "receiverName",
        u.phone_number AS "receiverPhone",
        t.amount,
        t.transaction_time AS date,
        t.transaction_status AS status,
        t.remarks AS note,
        0 AS fee 
      FROM transactions t
      -- Join accounts and users to get the details of the OTHER person in the transaction
      JOIN accounts a ON (
        CASE 
          WHEN t.sender_account_id = (SELECT account_id FROM accounts WHERE user_id = $1) THEN t.receiver_account_id
          ELSE t.sender_account_id
        END = a.account_id
      )
      JOIN users u ON a.user_id = u.user_id
      WHERE t.sender_account_id = (SELECT account_id FROM accounts WHERE user_id = $1)
         OR t.receiver_account_id = (SELECT account_id FROM accounts WHERE user_id = $1)
      ORDER BY t.transaction_time DESC
    `, [userId]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching history:', err.message);
    res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
}

module.exports = { sendMoney,cashOut,cashIn, getTransactionHistory };