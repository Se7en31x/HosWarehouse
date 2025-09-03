const express = require("express");
const router = express.Router();
const RequestStatusController = require("../controllers/requestStatusController");
const authMiddleware = require("../middleware/auth");

// ✅ ดึงคำขอทั้งหมดพร้อมข้อมูลผู้ใช้ (สำหรับหน้ารวม)
router.get(
  "/requestStatus",
  authMiddleware(["manage", "marehouse_manager"]),
  RequestStatusController.getRequestsByStatus
);

// ✅ ดึงรายละเอียดคำขอ (เฉพาะ manage/marehouse_manager)
router.get(
  "/requestStatus/:request_id",
  authMiddleware(["manage", "marehouse_manager"]),
  RequestStatusController.getRequestById
);

// ✅ อัปเดตสถานะย่อยแบบ Batch (เฉพาะ manage/marehouse_manager)
router.put(
  "/requestStatus/:requestId/processing-status-batch",
  authMiddleware(["manage", "marehouse_manager"]),
  RequestStatusController.updateProcessingStatusBatch
);

module.exports = router;
