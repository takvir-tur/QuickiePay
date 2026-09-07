const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { sendMoney, cashIn, cashOut, getTransactionHistory } = require('../controllers/transactionController');
// The verifyToken middleware ensures req.user is populated with the sender's ID
// Agent Cash In 
router.post( '/cash-in', verifyToken, cashIn );
// Agent Cash Out 
router.post( '/cash-out', verifyToken, cashOut );

router.post('/send-money', verifyToken, sendMoney);
router.get('/history', verifyToken, getTransactionHistory);

module.exports = router;