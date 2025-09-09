const express = require('express');
const router = express.Router();
const damagedController = require('../controllers/damagedController');
const authMiddleware = require('../middleware/auth');

// ✅ GET รายการของชำรุด (staff + manage/warehouse_manager)
router.get(
  '/damaged',
  authMiddleware(['warehouse_manager']),
  damagedController.getDamagedItems
);

// ✅ GET ประวัติการดำเนินการของ damaged_id (เฉพาะ manager/warehouse_manager)
router.get(
  '/damaged/:damaged_id/actions',
  authMiddleware(['warehouse_manager']),
  damagedController.getDamagedActions
);

// ✅ POST เพิ่มการดำเนินการ (เฉพาะ manager/warehouse_manager)
router.post(
  '/damaged/:damaged_id/action',
  authMiddleware(['warehouse_manager']),
  damagedController.addDamagedAction
);

module.exports = router;
