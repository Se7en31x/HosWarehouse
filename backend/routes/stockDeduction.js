// routes/stockDeductionRoutes.js
const express = require('express');
const router = express.Router();
const stockDeductionController = require('../controllers/stockDeductionController');

router.get('/stockDeduction/approved', stockDeductionController.getApprovedRequests);
router.get('/stockDeduction/:requestId', stockDeductionController.getRequestDetails);
router.post('/stockDeduction/deduct', stockDeductionController.deductStock); // <-- ตรวจสอบบรรทัดนี้

module.exports = router;