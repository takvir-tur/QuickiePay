const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');

const { 
  sendMoney, 
  cashIn, 
  cashOut, 
  makePayment,
  payBill,
  getMerchantLookup,
  getRecentContacts,
  getTransactionHistory,
  getAgentLookup,
  mobileRecharge
} = require('../controllers/transactionController');

// Agent Cash In (supports both snake_case and kebab-case)
router.post('/cash_in', verifyToken, cashIn);
router.post('/cash-in', verifyToken, cashIn);

// Cash Out (supports both snake_case and kebab-case)
router.post('/cash_out', verifyToken, cashOut);
router.post('/cash-out', verifyToken, cashOut);

// Make Payment (supports both snake_case and kebab-case)
router.post('/make_payment', verifyToken, makePayment);
router.post('/make-payment', verifyToken, makePayment);

// Pay Bill (supports both snake_case and kebab-case)
router.post('/pay_bill', verifyToken, payBill);
router.post('/pay-bill', verifyToken, payBill);

// Lookups & Contacts
router.get('/agent-lookup/:phone', verifyToken, getAgentLookup);
router.get('/merchant-lookup/:phone', verifyToken, getMerchantLookup);
router.get('/recent-contacts', verifyToken, getRecentContacts);

router.post('/send-money', verifyToken, sendMoney);
router.post('/mobile-recharge', verifyToken, mobileRecharge);
router.get('/history', verifyToken, getTransactionHistory);

module.exports = router;