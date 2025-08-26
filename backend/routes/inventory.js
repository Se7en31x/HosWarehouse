// routes/inventory.js
const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

// --------------------------------------------------------
// ✅ ROUTES สำหรับผู้ดูแลคลัง (Manager)
// --------------------------------------------------------
// ดึงข้อมูลสินค้าทั้งหมดแบบละเอียด (ใช้สำหรับหน้า Overview)
router.get('/inventoryCheck/all', inventoryController.getAllItems);
// ดึงข้อมูลสินค้าชิ้นเดียวพร้อมรายละเอียด Lot (ใช้สำหรับหน้ารายละเอียดสินค้า)
router.get('/inventoryCheck/:id', inventoryController.getItemById);


// --------------------------------------------------------
// ✅ ROUTES ใหม่สำหรับพนักงานทั่วไป (Staff)
// --------------------------------------------------------
// ดึงข้อมูลสินค้าทั้งหมดแบบย่อ (ใช้สำหรับหน้าเบิก-ยืม)
router.get('/for-withdrawal', inventoryController.getAllItemsForWithdrawal);
// --------------------------------------------------------
// ✅ ROUTES ที่ใช้ร่วมกัน
// --------------------------------------------------------
// บันทึกของชำรุด (สามารถใช้ได้ทั้ง Staff และ Manager)
router.post('/damaged', inventoryController.reportDamaged);

// ✅ เพิ่ม Route ใหม่สำหรับปรับปรุงจำนวน
router.post('/inventory/adjust', inventoryController.adjustInventory);

module.exports = router;