const pool = require('../db_connection');
const bcrypt = require('bcryptjs');

async function getBillerProfile(req, res) {
  try {
    const userId = req.user.user_id;

    const billerResult = await pool.query(`
      SELECT u.user_id, u.full_name, u.phone_number, a.balance, a.account_id, b.biller_id 
      FROM users u
      JOIN accounts a ON u.user_id = a.user_id
      JOIN billers b ON u.user_id = b.user_id
      WHERE u.user_id = $1
    `, [userId]);

    if (billerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Biller not found' });
    }

    const biller = billerResult.rows[0];

    const servicesResult = await pool.query(`
      SELECT service_id, service_name, organization_name 
      FROM services 
      WHERE biller_id = $1
    `, [biller.biller_id]);

    biller.services = servicesResult.rows;

    res.json(biller);
  } catch (err) {
    console.error('Error fetching biller profile:', err.message);
    res.status(500).json({ error: 'Server error while fetching biller data' });
  }
}

// =====================================================
// BILLER BANK TRANSFER (Transfer money to bank account)
// =====================================================

async function billerBankTransfer(req, res) {
  const userId = req.user.user_id;
  const {
    bank_name,
    account_holder_name,
    account_number,
    branch_name,
    routing_number,
    amount,
    pin
  } = req.body;

  if (!bank_name || !account_holder_name || !account_number || !amount || !pin) {
    return res.status(400).json({
      error: 'Bank name, account holder, account number, amount, and PIN are required'
    });
  }

  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0' });
  }

  const client = await pool.connect();

  try {
    // 1. Get Biller info and verify PIN
    const billerResult = await client.query(`
      SELECT u.pin_hash, a.account_id AS biller_account_id, a.balance, b.biller_id
      FROM users u
      JOIN accounts a ON u.user_id = a.user_id
      JOIN billers b ON u.user_id = b.user_id
      WHERE u.user_id = $1
    `, [userId]);

    if (billerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Biller account not found' });
    }

    const biller = billerResult.rows[0];

    const isPinValid = await bcrypt.compare(pin, biller.pin_hash);
    if (!isPinValid) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    // 2. Check balance
    const currentBalance = parseFloat(biller.balance);
    if (currentBalance < numericAmount) {
      return res.status(400).json({
        error: `Insufficient balance. Available: ৳${currentBalance.toFixed(2)}, Required: ৳${numericAmount.toFixed(2)}`
      });
    }

    // 3. Find Admin account for double-entry settlement
    const adminAccResult = await client.query(`
      SELECT account_id FROM accounts WHERE account_type = 'ADMIN' LIMIT 1
    `);
    const adminAccountId = adminAccResult.rows.length > 0
      ? adminAccResult.rows[0].account_id
      : 'b0000000-0000-0000-0000-000000000000';

    await client.query('BEGIN');

    // Lock biller account
    await client.query('SELECT balance FROM accounts WHERE account_id = $1 FOR UPDATE', [biller.biller_account_id]);

    // Re-verify balance
    const balanceCheck = await client.query('SELECT balance FROM accounts WHERE account_id = $1', [biller.biller_account_id]);
    if (parseFloat(balanceCheck.rows[0].balance) < numericAmount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Deduct from biller balance
    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE account_id = $2',
      [numericAmount, biller.biller_account_id]
    );

    // Record in transactions table
    const referenceNo = `BNK${Date.now()}`;
    const txnResult = await client.query(`
      INSERT INTO transactions
      (reference_no, transaction_type, sender_account_id, receiver_account_id, amount, fee, transaction_status, remarks)
      VALUES ($1, 'CASH_OUT', $2, $3, $4, 0, 'SUCCESS', $5)
      RETURNING transaction_id
    `, [
      referenceNo,
      biller.biller_account_id,
      adminAccountId,
      numericAmount,
      `Bank Payout to ${bank_name} - ${account_number}`
    ]);

    const txnId = txnResult.rows[0].transaction_id;

    // Record in biller_bank_transfers table
    const transferResult = await client.query(`
      INSERT INTO biller_bank_transfers
      (biller_id, transaction_id, bank_name, account_holder_name, account_number, branch_name, routing_number, amount, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'COMPLETED')
      RETURNING *
    `, [
      biller.biller_id,
      txnId,
      bank_name,
      account_holder_name,
      account_number,
      branch_name || null,
      routing_number || null,
      numericAmount
    ]);

    await client.query('COMMIT');

    res.status(200).json({
      message: 'Bank transfer payout completed successfully',
      referenceNo,
      transfer: transferResult.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Biller Bank Transfer Error:', err);
    res.status(500).json({ error: 'Bank transfer failed: ' + err.message });
  } finally {
    client.release();
  }
}

// Get biller's bank transfer history
async function getBillerBankTransfers(req, res) {
  const userId = req.user.user_id;

  try {
    const result = await pool.query(`
      SELECT bt.*, t.reference_no, t.transaction_time
      FROM biller_bank_transfers bt
      JOIN billers b ON bt.biller_id = b.biller_id
      LEFT JOIN transactions t ON bt.transaction_id = t.transaction_id
      WHERE b.user_id = $1
      ORDER BY bt.created_at DESC
    `, [userId]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching bank transfers:', err.message);
    res.status(500).json({ error: 'Failed to fetch bank transfers' });
  }
}

// Get bill collections / bills issued
async function getBillerBills(req, res) {
  const userId = req.user.user_id;

  try {
    const result = await pool.query(`
      SELECT 
        t.transaction_id,
        t.reference_no,
        t.amount,
        t.transaction_status,
        t.transaction_time,
        bt.billing_month,
        bt.due_date,
        u.full_name AS customer_name,
        u.phone_number AS customer_phone
      FROM bill_transactions bt
      JOIN billers b ON bt.biller_id = b.biller_id
      JOIN transactions t ON bt.transaction_id = t.transaction_id
      JOIN accounts a ON t.sender_account_id = a.account_id
      JOIN users u ON a.user_id = u.user_id
      WHERE b.user_id = $1
      ORDER BY t.transaction_time DESC
    `, [userId]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching biller bills:', err.message);
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
}

// Add a service under this biller
async function addBillerService(req, res) {
  const userId = req.user.user_id;
  const { service_name, organization_name } = req.body;

  if (!service_name || !organization_name) {
    return res.status(400).json({ error: 'Service name and Organization name are required' });
  }

  try {
    const billerResult = await pool.query('SELECT biller_id FROM billers WHERE user_id = $1', [userId]);
    if (billerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Biller not found' });
    }

    const billerId = billerResult.rows[0].biller_id;

    const insertResult = await pool.query(`
      INSERT INTO services (biller_id, service_name, organization_name)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [billerId, service_name.toUpperCase(), organization_name]);

    res.status(201).json(insertResult.rows[0]);
  } catch (err) {
    console.error('Error adding service:', err.message);
    res.status(500).json({ error: 'Failed to add service' });
  }
}

// Public service categories for Bill Pay
async function getServiceCategories(req, res) {
  try {
    const result = await pool.query(`
      SELECT DISTINCT s.service_name
      FROM services s
      JOIN billers b ON s.biller_id = b.biller_id
      WHERE b.status IS NULL OR b.status = 'ACTIVE'
      ORDER BY s.service_name ASC
    `);

    res.json(result.rows.map(r => r.service_name));
  } catch (err) {
    console.error('Error fetching service categories:', err.message);
    res.status(500).json({ error: 'Server error while fetching service categories' });
  }
}

// Public organizations for Bill Pay
async function getOrganizationsByService(req, res) {
  const { serviceName } = req.params;

  try {
    const result = await pool.query(`
      SELECT
        s.service_id,
        s.organization_name,
        b.biller_id
      FROM services s
      JOIN billers b ON s.biller_id = b.biller_id
      WHERE UPPER(s.service_name) = UPPER($1)
        AND (b.status IS NULL OR b.status = 'ACTIVE')
      ORDER BY s.organization_name ASC
    `, [serviceName]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching organizations:', err.message);
    res.status(500).json({ error: 'Server error while fetching organizations' });
  }
}

module.exports = {
  getBillerProfile,
  billerBankTransfer,
  getBillerBankTransfers,
  getBillerBills,
  addBillerService,
  getServiceCategories,
  getOrganizationsByService
};