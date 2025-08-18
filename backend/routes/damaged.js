const express = require('express');
const router = express.Router();
const damagedController = require('../controllers/damagedController');

// GET รายการของชำรุด
router.get('/damaged', damagedController.getDamagedItems);

// GET ประวัติการดำเนินการของ damaged_id
router.get('/damaged/:damaged_id/actions', damagedController.getDamagedActions);

// PUT/POST อัปเดตบางส่วน
router.post('/damaged/:damaged_id/action', damagedController.addDamagedAction);

module.exports = router;
