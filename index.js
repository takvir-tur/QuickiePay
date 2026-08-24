const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testConnection() {
  try {
    // 1. Attempt to connect to the database
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL successfully!\n');
    
    // 2. Query the users table
    console.log('Fetching QuickiePay Users...\n');
    const res = await client.query('SELECT * FROM users');
    
    // 3. Print the results as a clean table
    console.table(res.rows);
    
    // 4. Release the client back to the pool
    client.release();

  } catch (err) {
    // 5. Handle any connection or querying errors
    console.error('❌ Database connection or query failed!', err.message);
  }
}

testConnection();