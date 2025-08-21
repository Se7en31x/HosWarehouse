// routes/rfqRoutes.js
const express = require('express');
const router = express.Router();
const rfqController = require('../controllers/rfqController');

router.post('/rfq', rfqController.handleCreateRfq);
router.get('/rfq/all', rfqController.handleGetAllRfq); // ✅ เส้นทางใหม่สำหรับดึงรายการทั้งหมด
router.get('/rfq/:rfq_id', rfqController.handleGetRfqById); // ✅ เส้นทางใหม่สำหรับดึงรายละเอียด

module.exports = router;