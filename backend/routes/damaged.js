const express = require('express');
const router = express.Router();
const damagedController = require('../controllers/damagedController');
const authMiddleware = require('../middleware/auth');

// ✅ GET รายการของชำรุด (staff + manage/marehouse_manager)
router.get(
  '/damaged',
  authMiddleware(['marehouse_manager']),
  damagedController.getDamagedItems
);

// ✅ GET ประวัติการดำเนินการของ damaged_id (เฉพาะ manager/marehouse_manager)
router.get(
  '/damaged/:damaged_id/actions',
  authMiddleware(['marehouse_manager']),
  damagedController.getDamagedActions
);

// ✅ POST เพิ่มการดำเนินการ (เฉพาะ manager/marehouse_manager)
router.post(
  '/damaged/:damaged_id/action',
  authMiddleware(['marehouse_manager']),
  damagedController.addDamagedAction
);

module.exports = router;
