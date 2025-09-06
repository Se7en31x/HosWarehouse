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
  authMiddleware(["doctor", "nurse", "nurse_assistant", "pharmacist"]), // 🔐 staff และ role อื่น ๆ ที่มีสิทธิ์เบิก
  inventoryController.getAllItemsForWithdrawal
);

// --------------------------------------------------------
// --------------------------------------------------------
router.post(
  '/damaged',
  authMiddleware(['marehouse_manager']), // 
  inventoryController.reportDamaged
);


router.post(
  '/inventory/adjust',
  authMiddleware(['marehouse_manager']), 
  inventoryController.adjustInventory
);

module.exports = router;
