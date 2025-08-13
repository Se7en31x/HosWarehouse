// routes/stockDeductionRoutes.js
const express = require('express');
const router = express.Router();
const stockDeductionController = require('../controllers/stockDeductionController'); // Path นี้ถูกต้อง

router.get('/stockDeduction/ready', stockDeductionController.getRequestsReadyForDeduction);
router.get('/stockDeduction/:requestId/details', stockDeductionController.getDeductionRequestDetails); // เพิ่ม /details เพื่อความชัดเจน

router.put('/stockDeduction/:requestId/process', stockDeductionController.processStockDeduction); // เปลี่ยน endpoint และ method

module.exports = router;