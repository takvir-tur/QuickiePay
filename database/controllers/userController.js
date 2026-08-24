const pool = require('../db_connection'); // Import the database pool

async function getAllUsers(req, res) {
  try {
    // 1. Ask the database for all users
    const result = await pool.query('SELECT * FROM users');
    
    // 2. Send the data back to the frontend as JSON
    res.json(result.rows); 
  } catch (err) {
    console.error('Error fetching users:', err.message);
    res.status(500).json({ error: 'Server error fetching users' });
  }
}

async function getUserById(req, res) {
  try {
    const { id } = req.params;

    // Change this query based on how your tables are linked!
    // Example: 'SELECT u.full_name, a.balance FROM users u JOIN accounts a ON u.user_id = a.user_id WHERE u.user_id = $1'
    const result = await pool.query('SELECT u.full_name, a.balance FROM users u JOIN accounts a ON u.user_id = a.user_id WHERE u.user_id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]); // Send back just that one user object
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server Error" });
  }
}

module.exports = { getAllUsers, getUserById };