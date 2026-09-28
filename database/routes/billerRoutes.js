const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
  getBillerProfile,
  billerBankTransfer,
  getBillerBankTransfers,
  getBillerBills,
  addBillerService,
  getServiceCategories,
  getOrganizationsByService
} = require('../controllers/billerController');

// Profile
router.get('/profile', verifyToken, getBillerProfile);

// Bank Transfer Payout
router.post('/bank-transfer', verifyToken, billerBankTransfer);
router.get('/bank-transfers', verifyToken, getBillerBankTransfers);

// Bills Issued / Received
router.get('/bills', verifyToken, getBillerBills);

// Services
router.post('/services', verifyToken, addBillerService);
router.get('/categories', verifyToken, getServiceCategories);
router.get('/organizations/:serviceName', verifyToken, getOrganizationsByService);

module.exports = router;