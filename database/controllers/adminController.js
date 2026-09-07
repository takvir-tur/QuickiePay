const pool = require('../db_connection');

async function getAdminDashboardData(req, res) {
  try {
    // 1. Get total users
    const usersResult = await pool.query('SELECT COUNT(*) FROM users');
    const totalUsers = parseInt(usersResult.rows[0].count);

    // 2. Get total transaction volume (Sum of all successful transaction amounts)
    const volumeResult = await pool.query(`
      SELECT SUM(amount) as total 
      FROM transactions 
      WHERE transaction_status = 'SUCCESS'
    `);
    const totalVolume = parseFloat(volumeResult.rows[0].total || 0);

    // 3. Get recent transactions for the ledger table
    const recentTxns = await pool.query(`
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
    `);

    // Format the database rows to match the exact shape your frontend interface expects
    const formattedRows = recentTxns.rows.map(txn => ({
      id: `TXN-${txn.transaction_id.substring(0, 8).toUpperCase()}`, // Shorten UUID
      name: txn.receiver_name,
      phone: txn.receiver_phone,
      type: txn.transaction_type.replace('_', ' '),
      amount: `৳${parseFloat(txn.amount).toFixed(2)}`,
      reason: txn.transaction_status,
      // Color code the status pill: Failed=High risk (red), Success=Low risk (gray)
      severity: txn.transaction_status === 'FAILED' ? 'high' : 'low' 
    }));

    // Send everything back in one clean package
    res.json({
      stats: {
        totalUsers: totalUsers.toLocaleString(),
        totalBalance: "৳---", // Placeholder until you implement global balance logic
        volume24h: `৳${totalVolume.toLocaleString()}`,
        pendingReviews: "0" 
      },
      flagged: formattedRows
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
    // 1. Find which subtype table holds this user
    const typeRes = await pool.query('SELECT account_type FROM accounts WHERE user_id = $1', [user_id]);
    if (typeRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const accountType = typeRes.rows[0].account_type;
    let tableName = '';
    
    if (accountType === 'PERSONAL') tableName = 'personal_accounts';
    else if (accountType === 'AGENT') tableName = 'agents';
    else if (accountType === 'BUSINESS') tableName = 'merchants';
    else if (accountType === 'BILLER') tableName = 'billers';
    else return res.status(400).json({ error: 'Cannot update status for this account type' });

    // 2. Flip the ENUM status directly in the database
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
      WHERE t.amount >= 50000 OR t.transaction_status = 'FAILED'
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
    const result = await pool.query(`
      UPDATE system_settings 
      SET setting_value = $1 
      WHERE setting_key = $2 
      RETURNING *
    `, [setting_value, setting_key]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Setting key not found' });
    }
    
    res.json({ message: 'Configuration updated successfully', setting: result.rows[0] });
  } catch (err) {
    console.error('Error updating setting:', err);
    res.status(500).json({ error: 'Server error updating setting' });
  }
}

// Ensure you export the new functions at the bottom!
module.exports = { 
  getAdminDashboardData, 
  getAllUsers, 
  toggleUserStatus, 
  getGlobalLedger,
  getFraudAlerts,
  getSystemSettings,   
  updateSystemSetting  
};