const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const authMiddleware = require('../middleware/auth'); // ✅ import middleware

// --------------------------------------------------------
// ✅ ROUTES สำหรับผู้ดูแลคลัง (Manager)
// --------------------------------------------------------
router.get(
  '/inventoryCheck/all',
  authMiddleware(['marehouse_manager']), // 🔐 เฉพาะ manage
  inventoryController.getAllItems
);

router.get(
  '/inventoryCheck/:id',
  authMiddleware(['marehouse_manager']), // 🔐 เฉพาะ manage
  inventoryController.getItemById
);

// --------------------------------------------------------
// ✅ ROUTES สำหรับพนักงานทั่วไป (Staff)
// --------------------------------------------------------
router.get(
  '/for-withdrawal',
  authMiddleware(['staff', 'nurse', 'doctor', 'pharmacist']), // 🔐 staff และ role อื่น ๆ ที่มีสิทธิ์เบิก
  inventoryController.getAllItemsForWithdrawal
);

// --------------------------------------------------------
// ✅ ROUTES ใช้ร่วมกัน (Staff + Manager)
// --------------------------------------------------------
router.post(
  '/damaged',
  authMiddleware(['marehouse_manager']), // 🔐 ทั้ง staff และ manage เข้าได้
  inventoryController.reportDamaged
);

router.post(
  '/inventory/adjust',
  authMiddleware(['marehouse_manager']), // 🔐 ปรับจำนวน = เฉพาะ manager
  inventoryController.adjustInventory
);

module.exports = router;
