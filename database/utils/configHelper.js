const pool = require('../db_connection');

async function getSystemConfigs() {
  const result = await pool.query('SELECT setting_key, setting_value FROM system_settings');
  const configs = {};
  result.rows.forEach(row => {
    configs[row.setting_key] = row.setting_value;
  });
  return configs;
}

module.exports = { getSystemConfigs };
