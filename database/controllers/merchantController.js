const pool = require('../db_connection');

async function getMerchantProfile(req, res) {
  try {
    const userId = req.user.user_id; // মিডওয়্যার থেকে ভেরিফাইড ইউজারের আইডি নেওয়া হচ্ছে

    // Users, accounts এবং merchants টেবিল জয়েন করে মার্চেন্টের ডাটা ফেচ করা
    const merchantResult = await pool.query(`
      SELECT u.user_id, u.full_name, u.phone_number, a.balance, a.account_id, m.business_name, m.trade_license, m.status 
      FROM users u
      JOIN accounts a ON u.user_id = a.user_id
      JOIN merchants m ON u.user_id = m.user_id
      WHERE u.user_id = $1
    `, [userId]);

    if (merchantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    const merchant = merchantResult.rows[0];

    // Fetch recent sales / payments received by this merchant
    const recentPayments = await pool.query(`
      SELECT 
        t.transaction_id,
        t.amount,
        t.transaction_type,
        t.transaction_time,
        u.full_name AS sender_name,
        u.phone_number AS sender_phone
      FROM transactions t
      JOIN accounts a ON t.sender_account_id = a.account_id
      JOIN users u ON a.user_id = u.user_id
      WHERE t.receiver_account_id = $1
      ORDER BY t.transaction_time DESC
      LIMIT 4;
    `, [merchant.account_id]);

    merchant.recentPayments = recentPayments.rows;

    res.json(merchant);
  } catch (err) {
    console.error('Error fetching merchant:', err.message);
    res.status(500).json({ error: 'Server error while fetching merchant data' });
  }
}

module.exports = { getMerchantProfile };