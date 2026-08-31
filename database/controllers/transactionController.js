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

module.exports = { sendMoney };