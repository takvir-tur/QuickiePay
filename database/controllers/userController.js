require('dotenv').config();
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

module.exports = { getAllUsers };