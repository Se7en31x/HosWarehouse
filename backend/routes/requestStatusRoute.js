const express = require("express");
const router = express.Router();
const RequestStatusController = require("../controllers/requestStatusController");

// ดึงคำขอทั้งหมดพร้อมข้อมูลผู้ใช้ (สำหรับหน้ารวม)
router.get("/requestStatus", RequestStatusController.getRequestsByStatus);
router.get("/requestStatus/:request_id", RequestStatusController.getRequestById);

// Route เดิมสำหรับอัปเดตสถานะย่อยแบบ Batch
router.put('/requestStatus/:requestId/processing-status-batch', RequestStatusController.updateProcessingStatusBatch);

module.exports = router;