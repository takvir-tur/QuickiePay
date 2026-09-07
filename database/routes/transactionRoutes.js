const express = require('express');
const router = express.Router();

// ✅ সঠিক নিয়ম: সেকেন্ড ব্রাকেট দিয়ে ইমপোর্ট করো
const { verifyToken } = require('../middleware/authMiddleware');

const { 
  sendMoney, 
  cashIn, 
  cashOut, 
  getTransactionHistory 
} = require('../controllers/transactionController');

// Agent Cash In 
router.post('/cash_in', verifyToken, cashIn);

// Agent Cash Out 
router.post('/cash_out', verifyToken, cashOut);

router.post('/send-money', verifyToken, sendMoney);
router.get('/history', verifyToken, getTransactionHistory);

module.exports = router;