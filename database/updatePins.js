require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Connect to your database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function updatePins() {
  try {
    console.log("Generating bcrypt hash for '1234'...");
    // 10 is the standard number of salt rounds
    const realHash = await bcrypt.hash('1234', 10); 
    
    console.log("Updating database...");
    // Update every user to have this new valid hash
    await pool.query('UPDATE users SET pin_hash = $1', [realHash]);
    
    console.log(`Success! All users updated. Sample hash: ${realHash}`);
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    pool.end();
  }
}

updatePins();