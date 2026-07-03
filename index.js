const { Pool } = require('pg');
require('dotenv').config(); // Eita .env file read korbe

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, // Automatic env file theke nibe
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL successfully! 🚀');
    const res = await client.query('SELECT NOW()');
    console.log('Database Current Time:', res.rows[0].now);
    client.release();
  } catch (err) {
    console.error('Database connection fail! ❌', err.message);
  }
}

testConnection();