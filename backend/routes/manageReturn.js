// Routes/manageReturnRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/manageReturnController');

// รวมคำขอยืม (สำหรับหน้า list)
router.get('/manage/returns/queue', ctrl.getBorrowQueue);

// รายละเอียดคำขอ + line items + ประวัติคืน (สำหรับหน้า detail)
router.get('/manage/returns/request/:request_id', ctrl.getManageReturnDetail);

// รับคืน (กดจากหน้า detail)
router.post('/manage/returns/receive', ctrl.receiveReturn);

module.exports = router;
