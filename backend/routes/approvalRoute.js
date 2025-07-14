const express = require("express");
const router = express.Router();
const approvalController = require("../controllers/approvalController");

// ดึงรายละเอียดคำขอสำหรับอนุมัติ
router.get("/approval/:request_id", approvalController.getApprovalDetail);

// อัปเดตหลายรายการย่อยในการอนุมัติ/ปฏิเสธครั้งเดียว
router.put("/approval/:request_id/bulk-update", approvalController.bulkUpdateRequestDetails);

module.exports = router;
