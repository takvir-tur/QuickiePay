const pool = require('../db_connection');

async function getBillerProfile(req, res) {
  try {
    // Middleware থেকে আসা verified user-এর ID ব্যবহার করা হচ্ছে
    const userId = req.user.user_id;

    // Users, accounts এবং billers টেবিল জয়েন করে ডাটা আনা
    const billerResult = await pool.query(`
      SELECT u.user_id, u.full_name, u.phone_number, a.balance, a.account_id, b.biller_id 
      FROM users u
      JOIN accounts a ON u.user_id = a.user_id
      JOIN billers b ON u.user_id = b.user_id
      WHERE u.user_id = $1
    `, [userId]);

    if (billerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Biller not found' });
    }

    const biller = billerResult.rows[0];

    // এই biller-এর আন্ডারে থাকা সার্ভিসগুলো ফেচ করা
    const servicesResult = await pool.query(`
      SELECT service_id, service_name, organization_name 
      FROM services 
      WHERE biller_id = $1
    `, [biller.biller_id]);

    biller.services = servicesResult.rows;

    res.json(biller);
  } catch (err) {
    console.error('Error fetching biller profile:', err.message);
    res.status(500).json({ error: 'Server error while fetching biller data' });
  }
}

module.exports = { getBillerProfile };