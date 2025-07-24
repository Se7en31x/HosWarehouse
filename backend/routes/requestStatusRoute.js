const express = require("express");
const router = express.Router();
const RequestStatusController = require("../controllers/requestStatusController"); // ยังคงเก็บไว้สำหรับ functions อื่นๆ

// ดึงคำขอทั้งหมดพร้อมข้อมูลผู้ใช้ (สำหรับหน้ารวม)
router.get("/requestStatus", RequestStatusController.getRequestsByStatus);
router.get("/requestStatus/:request_id" ,RequestStatusController.getRequestById);

router.put('/requestStatus/:requestId/processing-status-batch', RequestStatusController.updateProcessingStatusBatch);

module.exports = router;