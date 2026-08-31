require('dotenv').config();
const pool = require('../db_connection'); // Import the database pool

async function getUserById(req, res) {
  const { id } = req.params;

  try {
    // 1. Get the user's core data
    const userResult = await pool.query(`
      SELECT u.user_id, u.full_name, u.phone_number, a.balance, a.account_id 
      FROM users u
      LEFT JOIN accounts a ON u.user_id = a.user_id
      WHERE u.user_id = $1
    `, [id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // 2. Fetch Unique Quick Actions using a CTE (Common Table Expression)
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

    // Attach the actions to the response
    user.quickActions = recentActions.rows;

    res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err.message);
    res.status(500).json({ error: 'Server error while fetching user data' });
  }
}

module.exports = { getUserById };