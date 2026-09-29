const pool = require('../db_connection');
const bcrypt = require('bcryptjs');
const { getSystemConfigs } = require('../utils/configHelper');


async function makePayment(req, res) {
  const payerUserId = req.user.user_id;
  const { merchant_phone, amount, pin, note, invoice_number } = req.body;

  if (!merchant_phone || !amount || !pin) {
    return res.status(400).json({
      error: 'Merchant phone, amount and PIN are required'
    });
  }

  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0' });
  }

  const client = await pool.connect();

  try {
    const payerResult = await client.query(`
      SELECT u.pin_hash, a.account_id AS payer_account_id, a.balance
      FROM users u
      JOIN accounts a ON u.user_id = a.user_id
      WHERE u.user_id = $1
    `, [payerUserId]);

    if (payerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const payer = payerResult.rows[0];

    const isPinValid = await bcrypt.compare(pin, payer.pin_hash);
    if (!isPinValid) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    const merchantResult = await client.query(`
      SELECT u.full_name, m.merchant_id, m.business_name, m.status, a.account_id AS merchant_account_id
      FROM users u
      JOIN accounts a ON u.user_id = a.user_id
      JOIN merchants m ON u.user_id = m.user_id
      WHERE u.phone_number = $1
    `, [merchant_phone]);

    if (merchantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    const merchant = merchantResult.rows[0];

    if (merchant.status && merchant.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'This merchant is not currently active' });
    }

    if (merchant.merchant_account_id === payer.payer_account_id) {
      return res.status(400).json({ error: 'You cannot pay your own merchant account' });
    }

    const configs = await getSystemConfigs();
    if (configs.MAX_PER_TXN_LIMIT && numericAmount > Number(configs.MAX_PER_TXN_LIMIT)) {
        return res.status(400).json({ error: `Amount exceeds the maximum limit of ৳${configs.MAX_PER_TXN_LIMIT} per transaction.` });
    }

    await client.query('BEGIN');

    // Lock both accounts in deterministic sorted order to prevent deadlocks
    const accountsToLock = [payer.payer_account_id, merchant.merchant_account_id].sort();
    await client.query(`SELECT balance FROM accounts WHERE account_id = $1 FOR UPDATE`, [accountsToLock[0]]);
    await client.query(`SELECT balance FROM accounts WHERE account_id = $1 FOR UPDATE`, [accountsToLock[1]]);

    const balanceResult = await client.query(`SELECT balance FROM accounts WHERE account_id = $1`, [payer.payer_account_id]);

    if (parseFloat(balanceResult.rows[0].balance) < numericAmount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    await client.query(`UPDATE accounts SET balance = balance - $1 WHERE account_id = $2`, [numericAmount, payer.payer_account_id]);
    await client.query(`UPDATE accounts SET balance = balance + $1 WHERE account_id = $2`, [numericAmount, merchant.merchant_account_id]);

    const referenceNo = `PAY${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const txResult = await client.query(`
      INSERT INTO transactions
      (reference_no, transaction_type, sender_account_id, receiver_account_id, amount, fee, transaction_status, remarks)
      VALUES ($1, 'MAKE_PAYMENT', $2, $3, $4, 0, 'SUCCESS', $5)
      RETURNING transaction_id
    `, [referenceNo, payer.payer_account_id, merchant.merchant_account_id, numericAmount, note || null]);

    const transactionId = txResult.rows[0].transaction_id;

    // Record in payment_transactions table if available
    try {
      await client.query(`
        INSERT INTO payment_transactions (transaction_id, merchant_id, invoice_number)
        VALUES ($1, $2, $3)
      `, [transactionId, merchant.merchant_id, invoice_number || null]);
    } catch (e) {
      console.warn('payment_transactions insert skipped or error:', e.message);
    }

    // If an invoice_number was provided, mark that merchant_invoice as PAID
    if (invoice_number) {
      try {
        await client.query(`
          UPDATE merchant_invoices
          SET status = 'PAID', paid_at = CURRENT_TIMESTAMP
          WHERE invoice_number = $1 AND merchant_id = $2
        `, [invoice_number, merchant.merchant_id]);
      } catch (e) {
        console.warn('merchant_invoices update status skipped or error:', e.message);
      }
    }

    await client.query('COMMIT');

    res.status(200).json({
      message: 'Payment successful',
      referenceNo,
      merchant: merchant.business_name || merchant.full_name,
      amount: numericAmount
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Make Payment Error:', err.message);
    res.status(500).json({ error: 'Payment failed: ' + (err.message || 'Server error') });
  } finally {
    client.release();
  }
}

async function getMerchantLookup(req, res) {
  const { phone } = req.params;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  try {
    const result = await pool.query(
      `SELECT
        u.user_id,
        u.full_name,
        u.phone_number,
        m.merchant_id,
        m.business_name,
        m.trade_license,
        m.status
      FROM users u
      JOIN merchants m ON u.user_id = m.user_id
      WHERE u.phone_number = $1`,
      [phone]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Active merchant not found with this phone number' });
    }

    const merchant = result.rows[0];
    if (merchant.status && merchant.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'This merchant account is currently inactive' });
    }

    res.json({
      full_name: merchant.full_name,
      business_name: merchant.business_name,
      phone_number: merchant.phone_number,
      merchant_id: merchant.merchant_id
    });
  } catch (err) {
    console.error('Merchant Lookup Error:', err.message);
    res.status(500).json({ error: 'Failed to look up merchant' });
  }
}


async function sendMoney(req, res) {
  const senderUserId = req.user.user_id; 
  const { receiver_phone, amount, pin, note } = req.body;
  
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0' });
  }

  // 1. Check out connection
  const client = await pool.connect();
  
  try {
    // 2. Start Transaction
    await client.query("BEGIN");

    // 3. Get Sender Info & Verify PIN
    const senderResult = await client.query(`
      SELECT u.pin_hash, a.account_id
      FROM users u
      JOIN accounts a ON u.user_id = a.user_id
      WHERE u.user_id = $1
    `, [senderUserId]);
    
    if (senderResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: 'Sender not found' });
    }

    const sender = senderResult.rows[0];
    const isPinValid = await bcrypt.compare(pin, sender.pin_hash);
    if (!isPinValid) {
      await client.query("ROLLBACK");
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    // 4. Get Receiver Info
    const receiverResult = await client.query(`
      SELECT a.account_id 
      FROM users u
      JOIN accounts a ON u.user_id = a.user_id
      WHERE u.phone_number = $1
    `, [receiver_phone]);

    if (receiverResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: 'Receiver not found' });
    }

    const receiverAccountId = receiverResult.rows[0].account_id;
    const senderAccountId = sender.account_id;

    if (senderAccountId === receiverAccountId) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: 'You cannot send money to yourself' });
    }

    // 5. Global Configs & Limit Check
    const configs = await getSystemConfigs();

    if (configs.MAX_PER_TXN_LIMIT && numericAmount > Number(configs.MAX_PER_TXN_LIMIT)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: `Amount exceeds the maximum limit of ৳${configs.MAX_PER_TXN_LIMIT} per transaction.` });
    }
    
    const dailyLimitCheck = await client.query(`
      SELECT COALESCE(SUM(amount), 0) as daily_total 
      FROM transactions 
      WHERE sender_account_id = $1 
        AND DATE(transaction_time) = CURRENT_DATE 
        AND transaction_status = 'SUCCESS'
    `, [senderAccountId]);

    const dailyTotal = Number(dailyLimitCheck.rows[0].daily_total);
    
    if ((dailyTotal + numericAmount) > Number(configs.DAILY_TXN_LIMIT)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ 
          error: `Transaction exceeds your daily limit of ৳${configs.DAILY_TXN_LIMIT}. (Current daily total: ৳${dailyTotal})` 
      });
    }

    const fee = Number(configs.SEND_MONEY_FLAT_FEE);
    const totalDeduction = Number((numericAmount + fee).toFixed(2));

    // 6. Prevent Deadlocks: Sort Account IDs alphabetically
    const accountsToLock = [senderAccountId, receiverAccountId].sort();

    // 7. Lock Rows in deterministic order
    await client.query('SELECT balance FROM accounts WHERE account_id = $1 FOR UPDATE', [accountsToLock[0]]);
    await client.query('SELECT balance FROM accounts WHERE account_id = $1 FOR UPDATE', [accountsToLock[1]]);

    // 8. Check Sender's Exact Balance AFTER securing the lock
    const balanceCheck = await client.query('SELECT balance FROM accounts WHERE account_id = $1', [senderAccountId]);
    if (parseFloat(balanceCheck.rows[0].balance) < totalDeduction) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // 9. Execute Atomic Updates
    await client.query('UPDATE accounts SET balance = balance - $1 WHERE account_id = $2', [totalDeduction, senderAccountId]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE account_id = $2', [numericAmount, receiverAccountId]);

    // 10. Record the Transaction
    const referenceNo = `TXN${Date.now()}`;
    await client.query(`
      INSERT INTO transactions (reference_no, transaction_type, sender_account_id, receiver_account_id, amount, fee, transaction_status, remarks)
      VALUES ($1, 'SEND_MONEY', $2, $3, $4, $5, 'SUCCESS', $6)
    `, [referenceNo, senderAccountId, receiverAccountId, numericAmount, fee, note || null]);

    // 11. Commit
    await client.query('COMMIT');
    res.status(200).json({ message: 'Money sent successfully', referenceNo, amount: numericAmount, fee, totalDeduction });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Send Money Error:', err.message);
    res.status(500).json({ error: 'Transaction failed' });
  } finally {
    // 12. ALWAYS release the client
    client.release();
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
// Agent balance + (amount + commission) [money with charge sent to agent]
// Agent earns commission
// =====================================================

const cashOut = async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Logged-in user (Customer)
        const userId = req.user.user_id;

        const {
            agent_phone,
            amount,
            pin,
            note
        } = req.body;

        // -----------------------------
        // 1. Basic validation
        // -----------------------------

        if (!agent_phone || !amount || !pin) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                error: "Agent number, amount and PIN are required"
            });
        }

        const numericAmount = Number(amount);

        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                error: "Invalid amount"
            });
        }

        // -----------------------------
        // 2. Get logged-in user's account & verify PIN
        // -----------------------------

        const userResult = await client.query(
            `SELECT
                u.user_id,
                u.full_name,
                u.phone_number,
                u.pin_hash,
                acc.account_id,
                acc.account_type,
                acc.balance
             FROM users u
             JOIN accounts acc
               ON u.user_id = acc.user_id
             WHERE u.user_id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                error: "User account not found"
            });
        }

        const user = userResult.rows[0];

        // -----------------------------
        // 3. Check user PIN
        // -----------------------------

        const isPinValid = await bcrypt.compare(
            pin,
            user.pin_hash
        );

        if (!isPinValid) {
            await client.query("ROLLBACK");

            return res.status(401).json({
                error: "Invalid PIN"
            });
        }

        // -----------------------------
        // 4. Find active agent & agent account
        // -----------------------------

        const agentResult = await client.query(
            `SELECT
                u.user_id,
                u.full_name,
                u.phone_number,
                acc.account_id AS agent_account_id,
                a.agent_id,
                a.business_name,
                a.commission_rate,
                a.status
             FROM users u
             JOIN accounts acc
               ON u.user_id = acc.user_id
             JOIN agents a
               ON u.user_id = a.user_id
             WHERE u.phone_number = $1
               AND a.status = 'ACTIVE'`,
            [agent_phone]
        );

        if (agentResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                error: "Active agent not found with this phone number"
            });
        }

        const agent = agentResult.rows[0];

        // -----------------------------
        // 5. Prevent self cash-out
        // -----------------------------

        if (agent.user_id === userId || agent.agent_account_id === user.account_id) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                error: "You cannot cash out to yourself"
            });
        }

        const configs = await getSystemConfigs();

        if (configs.MAX_PER_TXN_LIMIT && numericAmount > Number(configs.MAX_PER_TXN_LIMIT)) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: `Amount exceeds the maximum limit of ৳${configs.MAX_PER_TXN_LIMIT} per transaction.` });
        }

        const dailyLimitCheck = await client.query(`
          SELECT COALESCE(SUM(amount), 0) as daily_total 
          FROM transactions 
          WHERE sender_account_id = $1 
            AND DATE(transaction_time) = CURRENT_DATE 
            AND transaction_status = 'SUCCESS'
        `, [user.account_id]);

        const dailyTotal = Number(dailyLimitCheck.rows[0].daily_total);
        
        if ((dailyTotal + numericAmount) > Number(configs.DAILY_TXN_LIMIT)) {
            await client.query("ROLLBACK");
            return res.status(400).json({ 
                error: `Transaction exceeds your daily limit of ৳${configs.DAILY_TXN_LIMIT}. (Current daily total: ৳${dailyTotal})` 
            });
        }

        const fee = (Number(numericAmount) * Number(configs.CASH_OUT_FEE_PCT)) / 100;
        
        const totalDeduction = Number((numericAmount + fee).toFixed(2));
        // -----------------------------
        // 7. Lock Accounts in deterministic order (Deadlock Prevention)
        // -----------------------------

        const accountsToLock = [user.account_id, agent.agent_account_id].sort();
        await client.query(
            `SELECT balance FROM accounts WHERE account_id = $1 FOR UPDATE`,
            [accountsToLock[0]]
        );
        await client.query(
            `SELECT balance FROM accounts WHERE account_id = $1 FOR UPDATE`,
            [accountsToLock[1]]
        );

        // Check user balance after securing lock
        const balanceCheck = await client.query(
            `SELECT balance FROM accounts WHERE account_id = $1`,
            [user.account_id]
        );
        const currentUserBalance = parseFloat(balanceCheck.rows[0].balance);

        if (currentUserBalance < totalDeduction) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                error: `Insufficient balance. Required: ৳${totalDeduction.toFixed(2)} (Amount: ৳${numericAmount.toFixed(2)} + Charge: ৳${fee.toFixed(2)}), Available: ৳${currentUserBalance.toFixed(2)}`,
                balance: currentUserBalance,
                required: totalDeduction
            });
        }

        // -----------------------------
        // 8. Deduct money from user (Total deduction with charge)
        // -----------------------------

        await client.query(
            `UPDATE accounts
             SET balance = balance - $1
             WHERE account_id = $2`,
            [totalDeduction, user.account_id]
        );

        // -----------------------------
        // 9. Add money with charge to agent
        // Money with charge sent to agent
        // -----------------------------

        await client.query(
            `UPDATE accounts
             SET balance = balance + $1
             WHERE account_id = $2`,
            [totalDeduction, agent.agent_account_id]
        );

        // -----------------------------
        // 10. Create transaction record
        // -----------------------------

        const referenceNo = `COUT${Date.now()}`;

        const transactionResult = await client.query(
            `INSERT INTO transactions
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
            RETURNING transaction_id, reference_no, amount, fee`,
            [
                referenceNo,
                user.account_id,
                agent.agent_account_id,
                numericAmount,
                fee,
                note || null
            ]
        );

        const transaction = transactionResult.rows[0];

        // -----------------------------
        // 11. Cash transaction record
        // -----------------------------

        await client.query(
            `INSERT INTO cash_transactions
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
            )`,
            [
                transaction.transaction_id,
                agent.agent_id,
                fee
            ]
        );

        // -----------------------------
        // 12. Commit
        // -----------------------------

        // -----------------------------
        // 12. Commit
        // -----------------------------

        await client.query("COMMIT");

        return res.status(200).json({
            message: "Cash out successful",
            referenceNo: transaction.reference_no,
            amount: numericAmount,
            charge: fee, 
            commission: fee, 
            totalDeduction: totalDeduction,
            agent: {
                name: agent.full_name,
                phone: agent.phone_number,
                businessName: agent.business_name
            }
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Cash Out Error:", error);

        return res.status(500).json({
            error: "Cash out failed",
            details: error.message
        });

    } finally {
        client.release();
    }
};

// =====================================================
// AGENT LOOKUP FOR CASH OUT
// =====================================================

async function getAgentLookup(req, res) {
  const { phone } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
        u.user_id,
        u.full_name,
        u.phone_number,
        acc.account_id,
        ag.agent_id,
        ag.business_name,
        ag.commission_rate,
        ag.status
      FROM users u
      JOIN accounts acc ON u.user_id = acc.user_id
      JOIN agents ag ON u.user_id = ag.user_id
      WHERE u.phone_number = $1
    `, [phone]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agent = result.rows[0];
    if (agent.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Agent account is not active' });
    }

    if (agent.user_id === req.user.user_id) {
      return res.status(400).json({ error: 'You cannot cash out to yourself' });
    }

    res.json({
      name: agent.full_name,
      businessName: agent.business_name,
      phoneNumber: agent.phone_number,
      commissionRate: parseFloat(agent.commission_rate) || 1.50
    });
  } catch (err) {
    console.error('Agent lookup error:', err.message);
    res.status(500).json({ error: 'Failed to look up agent' });
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
        COALESCE(t.fee, 0) AS fee 
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

async function payBill(req, res) {
  const payerUserId = req.user.user_id;
  const { biller_id, service_id, biller_phone, amount, pin, billing_month, due_date, account_number, note } = req.body;

  if ((!biller_id && !biller_phone && !service_id) || !amount || !pin) {
    return res.status(400).json({ error: 'Biller/Service identifier, amount, and PIN are required' });
  }

  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0' });
  }

  const client = await pool.connect();
  try {
    // 1. Validate payer
    const payerResult = await client.query(`
      SELECT u.pin_hash, a.account_id AS payer_account_id, a.balance
      FROM users u
      JOIN accounts a ON u.user_id = a.user_id
      WHERE u.user_id = $1
    `, [payerUserId]);

    if (payerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payer account not found' });
    }

    const payer = payerResult.rows[0];
    const isPinValid = await bcrypt.compare(pin, payer.pin_hash);
    if (!isPinValid) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    // 2. Resolve biller and receiver account
    let billerResult;
    if (biller_id) {
      billerResult = await client.query(`
        SELECT b.biller_id, u.full_name, a.account_id AS biller_account_id
        FROM billers b
        JOIN users u ON b.user_id = u.user_id
        JOIN accounts a ON u.user_id = a.user_id
        WHERE b.biller_id = $1
      `, [biller_id]);
    } else if (service_id) {
      billerResult = await client.query(`
        SELECT b.biller_id, s.organization_name AS full_name, a.account_id AS biller_account_id
        FROM services s
        JOIN billers b ON s.biller_id = b.biller_id
        JOIN users u ON b.user_id = u.user_id
        JOIN accounts a ON u.user_id = a.user_id
        WHERE s.service_id = $1
      `, [service_id]);
    } else if (biller_phone) {
      billerResult = await client.query(`
        SELECT b.biller_id, u.full_name, a.account_id AS biller_account_id
        FROM billers b
        JOIN users u ON b.user_id = u.user_id
        JOIN accounts a ON u.user_id = a.user_id
        WHERE u.phone_number = $1
      `, [biller_phone]);
    }

    // Fallback to any active biller if none specified or not found
    if (!billerResult || billerResult.rows.length === 0) {
      billerResult = await client.query(`
        SELECT b.biller_id, u.full_name, a.account_id AS biller_account_id
        FROM billers b
        JOIN users u ON b.user_id = u.user_id
        JOIN accounts a ON u.user_id = a.user_id
        LIMIT 1
      `);
    }

    if (billerResult.rows.length === 0) {
      return res.status(404).json({ error: 'No registered biller found to receive payment' });
    }

    const biller = billerResult.rows[0];

    if (biller.biller_account_id === payer.payer_account_id) {
      return res.status(400).json({ error: 'You cannot pay a bill to your own account' });
    }

    await client.query('BEGIN');

    // Deadlock-free locking
    const accountsToLock = [payer.payer_account_id, biller.biller_account_id].sort();
    await client.query(`SELECT balance FROM accounts WHERE account_id = $1 FOR UPDATE`, [accountsToLock[0]]);
    await client.query(`SELECT balance FROM accounts WHERE account_id = $1 FOR UPDATE`, [accountsToLock[1]]);

    const balanceCheck = await client.query(`SELECT balance FROM accounts WHERE account_id = $1`, [payer.payer_account_id]);
    if (parseFloat(balanceCheck.rows[0].balance) < numericAmount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    await client.query(`UPDATE accounts SET balance = balance - $1 WHERE account_id = $2`, [numericAmount, payer.payer_account_id]);
    await client.query(`UPDATE accounts SET balance = balance + $1 WHERE account_id = $2`, [numericAmount, biller.biller_account_id]);

    const referenceNo = `BIL${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const remarks = note || (account_number ? `Bill Acc: ${account_number}` : 'Utility Bill Payment');

    const txResult = await client.query(`
      INSERT INTO transactions
      (reference_no, transaction_type, sender_account_id, receiver_account_id, amount, fee, transaction_status, remarks)
      VALUES ($1, 'BILL_PAYMENT', $2, $3, $4, 0, 'SUCCESS', $5)
      RETURNING transaction_id
    `, [referenceNo, payer.payer_account_id, biller.biller_account_id, numericAmount, remarks]);

    const transactionId = txResult.rows[0].transaction_id;

    // Record in bill_transactions table
    try {
      await client.query(`
        INSERT INTO bill_transactions (transaction_id, biller_id, billing_month, due_date)
        VALUES ($1, $2, $3, $4)
      `, [
        transactionId,
        biller.biller_id,
        billing_month || new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
        due_date || null
      ]);
    } catch (e) {
      console.warn('bill_transactions insert warning:', e.message);
    }

    await client.query('COMMIT');

    res.status(200).json({
      message: 'Bill payment successful',
      referenceNo,
      biller: biller.full_name,
      amount: numericAmount,
      billing_month: billing_month || new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      account_number
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Pay Bill Error:', err.message);
    res.status(500).json({ error: 'Bill payment failed: ' + (err.message || 'Server error') });
  } finally {
    client.release();
  }
}

async function getRecentContacts(req, res) {
  const userId = req.user.user_id;

  try {
    const result = await pool.query(`
      SELECT 
        u.user_id,
        u.full_name AS name,
        u.phone_number AS phone,
        MAX(t.transaction_time) AS last_transacted,
        (
          SELECT t2.amount 
          FROM transactions t2 
          WHERE (t2.sender_account_id = a.account_id AND t2.receiver_account_id = user_account.account_id)
             OR (t2.sender_account_id = user_account.account_id AND t2.receiver_account_id = a.account_id)
          ORDER BY t2.transaction_time DESC 
          LIMIT 1
        ) AS last_amount,
        (
          SELECT t3.remarks 
          FROM transactions t3 
          WHERE (t3.sender_account_id = a.account_id AND t3.receiver_account_id = user_account.account_id)
             OR (t3.sender_account_id = user_account.account_id AND t3.receiver_account_id = a.account_id)
          ORDER BY t3.transaction_time DESC 
          LIMIT 1
        ) AS last_note
      FROM transactions t
      JOIN accounts user_account ON user_account.user_id = $1
      JOIN accounts a ON (
        CASE 
          WHEN t.sender_account_id = user_account.account_id THEN t.receiver_account_id
          ELSE t.sender_account_id
        END = a.account_id
      )
      JOIN users u ON a.user_id = u.user_id
      WHERE (t.sender_account_id = user_account.account_id OR t.receiver_account_id = user_account.account_id)
        AND u.user_id != $1
      GROUP BY u.user_id, u.full_name, u.phone_number, a.account_id, user_account.account_id
      ORDER BY last_transacted DESC
      LIMIT 8
    `, [userId]);

    const formatted = result.rows.map((row) => {
      const parts = (row.name || '').trim().split(' ');
      const initials = parts.length >= 2 
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : (row.name || 'QP').substring(0, 2).toUpperCase();

      const lastDate = row.last_transacted ? new Date(row.last_transacted).toLocaleDateString() : '';
      const note = row.last_amount ? `৳${row.last_amount} · ${lastDate}` : (row.last_note || lastDate);

      return {
        name: row.name,
        phone: row.phone,
        initials,
        note
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching recent contacts:', err.message);
    res.status(500).json({ error: 'Failed to fetch recent contacts' });
  }
}

module.exports = { 
  sendMoney, 
  cashOut, 
  cashIn, 
  makePayment,
  payBill,
  getMerchantLookup,
  getRecentContacts,
  getTransactionHistory, 
  getAgentLookup 
};