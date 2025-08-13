// routes/transactionRoutes.js
const express = require('express');
const router = express.Router();
const transactionHistoryController = require('../controllers/transactionHistoryController');

// GET /api/v1/transaction-history?group=true
router.get('/transaction-history', transactionHistoryController.getAllLogs);

// GET /api/v1/transaction-history/request/:requestId
router.get('/transaction-history/request/:requestId', transactionHistoryController.getRequestDetails);

// ★ NEW: GET /api/v1/transaction-history/stock-movement?move_code=XXXX
router.get('/transaction-history/stock-movement', transactionHistoryController.getStockMovementByCode);

module.exports = router;
