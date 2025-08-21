// routes/prRoutes.js
const express = require('express');
const router = express.Router();
const prController = require('../controllers/prController');

// เส้นทางสำหรับบันทึกคำขอซื้อ
router.post('/purchase-request', prController.handleCreatePurchaseRequest);

// เส้นทางสำหรับดึงรายการสินค้า
router.get('/items', prController.getItems);

// เส้นทางสำหรับดึงรายการ PR ทั้งหมด
router.get('/pr/all', prController.handleGetAllPurchaseRequests);

// เส้นทางสำหรับดึงรายละเอียด PR ตาม ID
router.get('/pr/:pr_id', prController.handleGetPurchaseRequestById);

// ✅ เพิ่มเส้นทางใหม่สำหรับอัปเดตสถานะ PR
router.patch('/pr/:pr_id', prController.handleUpdatePrStatus);

module.exports = router;