const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { sendMoney } = require('../controllers/transactionController');

// The verifyToken middleware ensures req.user is populated with the sender's ID
router.post('/send-money', verifyToken, sendMoney);

module.exports = router;