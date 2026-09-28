const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
  getMerchantProfile,
  getInvoices,
  createInvoice,
  updateInvoiceStatus,
  getMerchantTransactions,
  getStoreItems,
  addStoreItem,
  updateStoreItem,
  deleteStoreItem
} = require('../controllers/merchantController');

// Merchant Profile & Dashboard
router.get('/profile', verifyToken, getMerchantProfile);

// Merchant Invoices
router.get('/invoices', verifyToken, getInvoices);
router.post('/invoices', verifyToken, createInvoice);
router.patch('/invoices/:id/status', verifyToken, updateInvoiceStatus);

// Merchant Transactions / Sales
router.get('/transactions', verifyToken, getMerchantTransactions);

// Merchant Store Items / Inventory
router.get('/store/items', verifyToken, getStoreItems);
router.post('/store/items', verifyToken, addStoreItem);
router.put('/store/items/:id', verifyToken, updateStoreItem);
router.delete('/store/items/:id', verifyToken, deleteStoreItem);

module.exports = router;