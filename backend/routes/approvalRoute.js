const express = require("express");
const router = express.Router();
const approvalController = require("../controllers/approvalController");
const authMiddleware = require("../middleware/auth");

// ✅ ดึงรายละเอียดคำขอสำหรับอนุมัติ (เฉพาะ manage/marehouse_manager)
router.get(
  "/approval/:request_id",
  authMiddleware(["manage", "marehouse_manager"]),
  approvalController.getApprovalDetail
);

// ✅ อัปเดตหลายรายการย่อย (อนุมัติ/ปฏิเสธ) (เฉพาะ manage/marehouse_manager)
router.put(
  "/approval/:request_id/bulk-update",
  authMiddleware(["manage", "marehouse_manager"]),
  approvalController.bulkUpdateRequestDetails
);

module.exports = router;
