// routes/stockDeductionRoutes.js
const express = require('express');
const router = express.Router();
const stockDeductionController = require('../controllers/stockDeductionController'); // Path นี้ถูกต้อง

// Route สำหรับดึงรายการคำขอที่พร้อมเบิก-จ่าย
// เปลี่ยนจาก .getApprovedRequests เป็น .getRequestsReadyForDeduction
router.get('/stockDeduction/ready', stockDeductionController.getRequestsReadyForDeduction);

// Route สำหรับดึงรายละเอียดคำขอเพื่อจัดการสถานะ
// เปลี่ยนจาก .getRequestDetails เป็น .getDeductionRequestDetails
router.get('/stockDeduction/:requestId/details', stockDeductionController.getDeductionRequestDetails); // เพิ่ม /details เพื่อความชัดเจน

// Route สำหรับอัปเดตสถานะการดำเนินการและตัดสต็อก
// เปลี่ยนจาก .deductStock เป็น .processStockDeduction และเปลี่ยนเป็น PUT method เพื่อความเหมาะสม
router.put('/stockDeduction/:requestId/process', stockDeductionController.processStockDeduction); // เปลี่ยน endpoint และ method

module.exports = router;