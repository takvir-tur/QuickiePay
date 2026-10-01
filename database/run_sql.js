const fs = require('fs');
const pool = require('./db_connection');

async function run() {
  try {
    const sql = fs.readFileSync('../SQL/advanced_features.sql', 'utf8');
    await pool.query(sql);
    console.log('Successfully executed advanced_features.sql');
  } catch (err) {
    console.error('Error executing SQL:', err);
  } finally {
    pool.end();
  }
}
run();
