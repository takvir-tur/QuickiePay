require('dotenv').config();
const pool = require('../db_connection'); // Import the database pool

async function getUserById(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT u.full_name, a.balance FROM users u JOIN accounts a ON u.user_id = a.user_id WHERE u.user_id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server Error" });
  }
}

module.exports = { getUserById };