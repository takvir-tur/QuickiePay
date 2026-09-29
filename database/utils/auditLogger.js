const logAdminAction = async (pool, adminId, action, options = {}) => {
  const {
    affectedUserId = null,
    transactionId = null,
    description = null,
    ipAddress = null
  } = options;

  try {
    let actualAdminId = adminId;
    
    // Check if the provided adminId is actually the user_id (from req.user)
    const adminCheck = await pool.query(
      'SELECT admin_id FROM admins WHERE user_id = $1 OR admin_id = $1 LIMIT 1',
      [adminId]
    );

    if (adminCheck.rows.length > 0) {
      actualAdminId = adminCheck.rows[0].admin_id;
    }

    const query = `
      INSERT INTO audit_logs (admin_id, affected_user_id, transaction_id, action, description, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    const values = [
      actualAdminId,
      affectedUserId,
      transactionId,
      action,
      description,
      ipAddress
    ];

    await pool.query(query, values);
  } catch (err) {
    console.error('[AuditLogger] Error logging admin action:', err);
  }
};

module.exports = { logAdminAction };
