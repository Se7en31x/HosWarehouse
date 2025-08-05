// routes/routes.js

const express = require('express');
const router = express.Router();
const transactionHistoryController = require('../controllers/transactionHistoryController');

// กำหนดเส้นทางสำหรับดึงประวัติการทำรายการทั้งหมด
// Endpoint: /api/v1/transaction-history
router.get('/transaction-history', transactionHistoryController.getAllLogs);

// สามารถเพิ่ม routes อื่นๆ ที่เกี่ยวข้องได้ที่นี่
// router.get('/transaction-history/:id', transactionHistoryController.getLogDetails);

module.exports = router;