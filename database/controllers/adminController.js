const pool = require('../db_connection');
const { logAdminAction } = require('../utils/auditLogger');

async function getAdminDashboardData(req, res) {
  try {
    const [usersResult, balanceResult, volumeResult, pendingResult, recentTxnsResult] = await Promise.all([
      pool.query(`
        SELECT COUNT(*)::int AS total_users 
        FROM users u
        LEFT JOIN personal_accounts pa ON u.user_id = pa.user_id
        LEFT JOIN agents a ON u.user_id = a.user_id
        LEFT JOIN merchants m ON u.user_id = m.user_id
        LEFT JOIN billers b ON u.user_id = b.user_id
        WHERE COALESCE(pa.status, a.status, m.status, b.status) = 'ACTIVE'
      `),
      pool.query(`SELECT COALESCE(SUM(balance), 0)::float AS total_balance FROM accounts`),
      pool.query(`SELECT COALESCE(SUM(amount), 0)::float AS volume_24h FROM transactions WHERE transaction_time >= NOW() - INTERVAL '24 hours' AND transaction_status = 'SUCCESS'`),
      pool.query(`
        SELECT COUNT(*)::int AS pending_reviews 
        FROM transactions 
        WHERE (amount >= 50000 OR transaction_status = 'FAILED') 
          AND (is_risk_reviewed IS NULL OR is_risk_reviewed = FALSE)
      `),
      pool.query(`
        SELECT 
          t.transaction_id, 
          t.transaction_type, 
          t.amount, 
          t.transaction_status,
          u.full_name as receiver_name,
          u.phone_number as receiver_phone
        FROM transactions t
        JOIN accounts a ON t.receiver_account_id = a.account_id
        JOIN users u ON a.user_id = u.user_id
        ORDER BY t.transaction_time DESC
        LIMIT 10
      `)
    ]);

    const totalUsers = usersResult.rows[0].total_users;
    const totalBalance = balanceResult.rows[0].total_balance;
    const volume24h = volumeResult.rows[0].volume_24h;
    const pendingReviews = pendingResult.rows[0].pending_reviews;

    const formattedRows = recentTxnsResult.rows.map(txn => ({
      id: `TXN-${txn.transaction_id.substring(0, 8).toUpperCase()}`,
      name: txn.receiver_name,
      phone: txn.receiver_phone,
      type: txn.transaction_type.replace('_', ' '),
      amount: `৳${parseFloat(txn.amount).toFixed(2)}`,
      reason: txn.transaction_status,
      severity: txn.transaction_status === 'FAILED' ? 'high' : 'low' 
    }));

    res.status(200).json({
      totalUsers,
      totalBalance,
      volume24h,
      pendingReviews,
      recentTransactions: formattedRows
    });

  } catch (err) {
    console.error('Error fetching admin data:', err);
    res.status(500).json({ error: 'Server error fetching admin dashboard' });
  }
}

// Fetch all users and dynamically locate their status from subtype tables
async function getAllUsers(req, res) {
  try {
    const users = await pool.query(`
      SELECT 
        u.user_id, u.full_name, u.phone_number, u.created_at,
        a.account_type, a.balance,
        COALESCE(pa.status, ag.status, m.status, b.status, 'ACTIVE') AS status
      FROM users u 
      JOIN accounts a ON u.user_id = a.user_id 
      LEFT JOIN personal_accounts pa ON u.user_id = pa.user_id
      LEFT JOIN agents ag ON u.user_id = ag.user_id
      LEFT JOIN merchants m ON u.user_id = m.user_id
      LEFT JOIN billers b ON u.user_id = b.user_id
      ORDER BY u.created_at DESC
    `);
    res.json(users.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Server error fetching users' });
  }
}

// Dynamically route the status update to the correct subtype table
async function toggleUserStatus(req, res) {
  const { user_id } = req.params;
  
  try {
    const typeRes = await pool.query('SELECT account_type FROM accounts WHERE user_id = $1', [user_id]);
    if (typeRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const accountType = typeRes.rows[0].account_type;
    let tableName = '';
    
    if (accountType === 'PERSONAL') tableName = 'personal_accounts';
    else if (accountType === 'AGENT') tableName = 'agents';
    else if (accountType === 'BUSINESS') tableName = 'merchants';
    else if (accountType === 'BILLER') tableName = 'billers';
    else return res.status(400).json({ error: 'Cannot update status for this account type' });

    const updateQuery = `
      UPDATE ${tableName}
      SET status = CASE 
        WHEN status = 'ACTIVE' THEN 'BLOCKED'::account_status 
        ELSE 'ACTIVE'::account_status 
      END
      WHERE user_id = $1
      RETURNING status
    `;
    
    const result = await pool.query(updateQuery, [user_id]);
    
    await logAdminAction(pool, req.user.user_id, 'TOGGLE_USER_STATUS', {
      affectedUserId: user_id,
      description: `User status changed to ${result.rows[0].status}`,
      ipAddress: req.ip || req.headers['x-forwarded-for']
    });

    res.json({ message: 'Status updated', status: result.rows[0].status });
    
  } catch (err) {
    console.error('Error toggling status:', err);
    res.status(500).json({ error: 'Server error updating status' });
  }
}

async function getGlobalLedger(req, res) {
  try {
    const ledger = await pool.query(`
      SELECT 
        t.transaction_id,
        t.reference_no,
        t.transaction_type,
        t.amount,
        t.fee,
        t.transaction_status,
        t.transaction_time,
        su.full_name AS sender_name,
        su.phone_number AS sender_phone,
        ru.full_name AS receiver_name,
        ru.phone_number AS receiver_phone
      FROM transactions t
      JOIN accounts sa ON t.sender_account_id = sa.account_id
      JOIN users su ON sa.user_id = su.user_id
      JOIN accounts ra ON t.receiver_account_id = ra.account_id
      JOIN users ru ON ra.user_id = ru.user_id
      ORDER BY t.transaction_time DESC
    `);
    
    res.json(ledger.rows);
  } catch (err) {
    console.error('Error fetching global ledger:', err);
    res.status(500).json({ error: 'Server error fetching global ledger' });
  }
}

async function getFraudAlerts(req, res) {
  try {
    const alerts = await pool.query(`
      SELECT 
        t.transaction_id,
        t.transaction_type,
        t.amount,
        t.transaction_time,
        u.user_id,
        u.full_name,
        u.phone_number,
        CASE 
          WHEN t.amount >= 100000 THEN 'Velocity spike / High amount'
          WHEN t.amount >= 50000 THEN 'Unusual transaction volume'
          WHEN t.transaction_status = 'FAILED' THEN 'Suspicious failure'
          ELSE 'System flagged'
        END as reason,
        CASE 
          WHEN t.amount >= 100000 THEN 'high'
          WHEN t.amount >= 50000 THEN 'medium'
          ELSE 'low'
        END as severity
      FROM transactions t
      JOIN accounts a ON t.sender_account_id = a.account_id
      JOIN users u ON a.user_id = u.user_id
      WHERE (t.amount >= 50000 OR t.transaction_status = 'FAILED')
        AND (t.is_risk_reviewed IS NULL OR t.is_risk_reviewed = FALSE)
      ORDER BY t.transaction_time DESC
      LIMIT 50
    `);
    
    res.json(alerts.rows);
  } catch (err) {
    console.error('Error fetching alerts:', err);
    res.status(500).json({ error: 'Server error fetching alerts' });
  }
}

// Fetch all system configurations
async function getSystemSettings(req, res) {
  try {
    const settings = await pool.query('SELECT * FROM system_settings ORDER BY setting_key');
    res.json(settings.rows);
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: 'Server error fetching settings' });
  }
}

// Update a specific system configuration
async function updateSystemSetting(req, res) {
  const { setting_key } = req.params;
  const { setting_value } = req.body;

  try {
    const updateQuery = `
      UPDATE system_settings 
      SET setting_value = $1 
      WHERE setting_key = $2 
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [setting_value, setting_key]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Setting key not found' });
    }
    
    await logAdminAction(pool, req.user.user_id, 'UPDATE_SYSTEM_SETTING', {
      description: `Updated system setting ${setting_key} to ${setting_value}`,
      ipAddress: req.ip || req.headers['x-forwarded-for']
    });

    res.json({ message: 'Configuration updated successfully', setting: result.rows[0] });
  } catch (err) {
    console.error('Error updating setting:', err);
    res.status(500).json({ error: 'Server error updating setting' });
  }
}

// Reverse a transaction
async function reverseTransaction(req, res) {
  const { transaction_id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const txnRes = await client.query('SELECT * FROM transactions WHERE transaction_id = $1 FOR UPDATE', [transaction_id]);
    
    if (txnRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const txn = txnRes.rows[0];

    if (txn.transaction_status === 'CANCELLED' || txn.transaction_status === 'FAILED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Transaction cannot be reversed because it is already ' + txn.transaction_status });
    }

    const accountsToLock = [txn.sender_account_id, txn.receiver_account_id].sort();
    if (accountsToLock[0] && accountsToLock[1]) {
      await client.query('SELECT balance FROM accounts WHERE account_id = $1 FOR UPDATE', [accountsToLock[0]]);
      await client.query('SELECT balance FROM accounts WHERE account_id = $1 FOR UPDATE', [accountsToLock[1]]);
    }

    const receiverBalanceRes = await client.query('SELECT balance FROM accounts WHERE account_id = $1', [txn.receiver_account_id]);
    if (receiverBalanceRes.rows.length > 0) {
      if (parseFloat(receiverBalanceRes.rows[0].balance) < parseFloat(txn.amount)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Receiver has insufficient balance to reverse this transaction' });
      }
      await client.query('UPDATE accounts SET balance = balance - $1 WHERE account_id = $2', [txn.amount, txn.receiver_account_id]);
    }

    if (txn.sender_account_id) {
      const refundAmount = parseFloat(txn.amount) + parseFloat(txn.fee || 0);
      await client.query('UPDATE accounts SET balance = balance + $1 WHERE account_id = $2', [refundAmount, txn.sender_account_id]);
    }

    await client.query("UPDATE transactions SET transaction_status = 'CANCELLED' WHERE transaction_id = $1", [transaction_id]);

    await client.query('COMMIT');
    res.json({ message: 'Transaction reversed successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error reversing transaction:', err);
    res.status(500).json({ error: 'Server error reversing transaction' });
  } finally {
    client.release();
  }
}

// Ignore a fraud alert
async function ignoreFraudAlert(req, res) {
  const { transaction_id } = req.params;
  try {
    const result = await pool.query(
      'UPDATE transactions SET is_risk_reviewed = TRUE WHERE transaction_id = $1 RETURNING transaction_id',
      [transaction_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await logAdminAction(pool, req.user.user_id, 'IGNORE_FRAUD_ALERT', {
      transactionId: transaction_id,
      description: 'Admin ignored fraud alert',
      ipAddress: req.ip || req.headers['x-forwarded-for']
    });

    res.status(200).json({ message: 'Alert ignored successfully' });
  } catch (err) {
    console.error('Error ignoring fraud alert:', err);
    res.status(500).json({ error: 'Server error ignoring fraud alert' });
  }
}

// Approve a Biller, Agent, or Merchant
async function approveAccount(req, res) {
  const { user_id } = req.params;
  
  try {
    const typeRes = await pool.query('SELECT account_type FROM accounts WHERE user_id = $1', [user_id]);
    if (typeRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const accountType = typeRes.rows[0].account_type;
    let tableName = '';
    
    if (accountType === 'AGENT') tableName = 'agents';
    else if (accountType === 'BUSINESS') tableName = 'merchants';
    else if (accountType === 'BILLER') tableName = 'billers';
    else return res.status(400).json({ error: 'Cannot approve this account type' });

    const adminRes = await pool.query('SELECT admin_id FROM admins WHERE user_id = $1', [req.user.user_id]);
    const actualAdminId = adminRes.rows.length > 0 ? adminRes.rows[0].admin_id : null;

    const updateQuery = `
      UPDATE ${tableName} 
      SET approved_by = $1 
      WHERE user_id = $2 
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [actualAdminId, user_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account details not found in specific table' });
    }

    await logAdminAction(pool, req.user.user_id, 'APPROVE_ACCOUNT', {
      affectedUserId: user_id,
      description: `Admin approved ${accountType} account`,
      ipAddress: req.ip || req.headers['x-forwarded-for']
    });

    res.json({ message: 'Account approved successfully' });
  } catch (err) {
    console.error('Error approving account:', err);
    res.status(500).json({ error: 'Server error approving account' });
  }
}

module.exports = { 
  getAdminDashboardData, 
  getAllUsers, 
  toggleUserStatus, 
  getGlobalLedger,
  getFraudAlerts,
  getSystemSettings,   
  updateSystemSetting,
  reverseTransaction,
  ignoreFraudAlert,
  approveAccount
};