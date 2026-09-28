require('dotenv').config();
const pool = require('../db_connection');
const bcrypt = require('bcryptjs');

// Get user by ID (existing dashboard feed)
async function getUserById(req, res) {
  const { id } = req.params;

  try {
    const userResult = await pool.query(`
      SELECT u.user_id, u.full_name, u.phone_number, u.email, u.national_id, a.balance, a.account_id, a.account_type
      FROM users u
      LEFT JOIN accounts a ON u.user_id = a.user_id
      WHERE u.user_id = $1
    `, [id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Quick Actions
    const recentActions = await pool.query(`
      WITH RecentTx AS (
        SELECT DISTINCT ON (t.receiver_account_id)
          u.full_name AS label,
          u.phone_number AS phone,
          t.transaction_type,
          t.amount,
          t.transaction_time
        FROM transactions t
        JOIN accounts a ON t.receiver_account_id = a.account_id
        JOIN users u ON a.user_id = u.user_id
        WHERE t.sender_account_id = $1
        ORDER BY t.receiver_account_id, t.transaction_time DESC
      )
      SELECT * FROM RecentTx ORDER BY transaction_time DESC LIMIT 4;
    `, [user.account_id]);

    user.quickActions = recentActions.rows;

    res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err.message);
    res.status(500).json({ error: 'Server error while fetching user data' });
  }
}

// Get full authenticated profile for current user (Settings page)
async function getProfile(req, res) {
  const userId = req.user.user_id;

  try {
    const userRes = await pool.query(`
      SELECT 
        u.user_id, 
        u.full_name, 
        u.phone_number, 
        u.email, 
        u.national_id,
        u.created_at,
        a.account_id, 
        a.account_type, 
        a.balance
      FROM users u
      JOIN accounts a ON u.user_id = a.user_id
      WHERE u.user_id = $1
    `, [userId]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const profile = userRes.rows[0];

    // Check role-specific info
    if (profile.account_type === 'AGENT') {
      const ag = await pool.query('SELECT agent_id, business_name, commission_rate, status FROM agents WHERE user_id = $1', [userId]);
      if (ag.rows.length > 0) profile.agent = ag.rows[0];
    } else if (profile.account_type === 'BUSINESS') {
      const mc = await pool.query('SELECT merchant_id, business_name, trade_license, status FROM merchants WHERE user_id = $1', [userId]);
      if (mc.rows.length > 0) profile.merchant = mc.rows[0];
    } else if (profile.account_type === 'BILLER') {
      const bl = await pool.query('SELECT biller_id, status FROM billers WHERE user_id = $1', [userId]);
      if (bl.rows.length > 0) {
        profile.biller = bl.rows[0];
        const srv = await pool.query('SELECT service_id, service_name, organization_name FROM services WHERE biller_id = $1', [profile.biller.biller_id]);
        profile.biller.services = srv.rows;
      }
    }

    res.json(profile);
  } catch (err) {
    console.error('Error in getProfile:', err.message);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

// Update profile details
async function updateProfile(req, res) {
  const userId = req.user.user_id;
  const { full_name, email, business_name, trade_license } = req.body;

  if (!full_name || !full_name.trim()) {
    return res.status(400).json({ error: 'Full name is required' });
  }

  try {
    await pool.query(
      `UPDATE users SET full_name = $1, email = $2 WHERE user_id = $3`,
      [full_name.trim(), email ? email.trim() : null, userId]
    );

    // If agent, update business_name
    if (business_name) {
      await pool.query(
        `UPDATE agents SET business_name = $1 WHERE user_id = $2`,
        [business_name.trim(), userId]
      );
      await pool.query(
        `UPDATE merchants SET business_name = $1, trade_license = $2 WHERE user_id = $3`,
        [business_name.trim(), trade_license ? trade_license.trim() : null, userId]
      );
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Error in updateProfile:', err.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}

// Change security PIN
async function changePin(req, res) {
  const userId = req.user.user_id;
  const { old_pin, new_pin } = req.body;

  if (!old_pin || !new_pin) {
    return res.status(400).json({ error: 'Current PIN and New PIN are required' });
  }

  if (new_pin.length < 4 || new_pin.length > 6 || !/^\d+$/.test(new_pin)) {
    return res.status(400).json({ error: 'New PIN must be 4 to 6 numeric digits' });
  }

  try {
    const userRes = await pool.query('SELECT pin_hash FROM users WHERE user_id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(old_pin, userRes.rows[0].pin_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current PIN is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(new_pin, salt);

    await pool.query('UPDATE users SET pin_hash = $1 WHERE user_id = $2', [newHash, userId]);

    res.json({ message: 'PIN changed successfully' });
  } catch (err) {
    console.error('Error in changePin:', err.message);
    res.status(500).json({ error: 'Failed to change PIN' });
  }
}

module.exports = {
  getUserById,
  getProfile,
  updateProfile,
  changePin
};