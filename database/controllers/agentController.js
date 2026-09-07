const pool = require('../db_connection');

async function getAgentProfile(req, res) {
  try {
    const userId = req.user.user_id; // মিডওয়ায়ার থেকে প্রাপ্ত ভেরিফাইড ইউজারের আইডি

    // Users, accounts এবং agents টেবিল জয়েন করে এজেন্টের ডাটা ফেচ করা
    const agentResult = await pool.query(`
      SELECT u.user_id, u.full_name, u.phone_number, a.balance, a.account_id, ag.agent_id 
      FROM users u
      JOIN accounts a ON u.user_id = a.user_id
      JOIN agents ag ON u.user_id = ag.user_id
      WHERE u.user_id = $1
    `, [userId]);

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agent = agentResult.rows[0];

    res.json(agent);
  } catch (err) {
    console.error('Error fetching agent profile:', err.message);
    res.status(500).json({ error: 'Server error while fetching agent data' });
  }
}

module.exports = { getAgentProfile };