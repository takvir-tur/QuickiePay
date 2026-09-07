const express = require('express');
const router = express.Router();

// Import your middlewares and the new controller
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');
const { 
  getAdminDashboardData, 
  getAllUsers, 
  toggleUserStatus,
  getGlobalLedger,
  getFraudAlerts,
  getSystemSettings,
  updateSystemSetting
} = require('../controllers/adminController');


// Define the dashboard route
// The URL will automatically become /api/admin/dashboard based on the main server file
router.get('/dashboard', verifyToken, verifyAdmin, getAdminDashboardData);
router.get('/users', verifyToken, verifyAdmin, getAllUsers);
router.patch('/users/:user_id/toggle-status', verifyToken, verifyAdmin, toggleUserStatus);
router.get('/ledger', verifyToken, verifyAdmin, getGlobalLedger, getFraudAlerts);
router.get('/config', verifyToken, verifyAdmin, getSystemSettings);
router.patch('/config/:setting_key', verifyToken, verifyAdmin, updateSystemSetting);

module.exports = router;
