// Routes/my-request-detail.js
const express = require('express');
const router = express.Router();
const myRequestDetailController = require('../controllers/myRequestDetailController');

// ✅ ดึงรายละเอียดของคำขอแบบรายตัว
router.get('/my-request-detail/:id', myRequestDetailController.getMyRequestDetail);

router.get('/my-request-detail/:id/edit', myRequestDetailController.getMyRequestDetail); // ถ้าจะใช้สำหรับโหลดหน้าฟอร์ม
router.put('/my-request-detail/:id/edit', myRequestDetailController.updateMyRequest);

module.exports = router;
