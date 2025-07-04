const express = require("express");
const router = express.Router();
const approvalController = require("../controllers/approvalController");

// ดึงรายละเอียดคำขอสำหรับการอนุมัติ
router.get("/approval/:request_id", approvalController.getApprovalDetail);

// อนุมัติคำขอทั้งหมด
router.put("/approval/:request_id/approve", approvalController.approveRequest);

// ปฏิเสธคำขอทั้งหมด
router.put("/approval/:request_id/reject", approvalController.rejectRequest);

// อนุมัติรายการย่อย
router.put("/approval/detail/:request_detail_id/approve", approvalController.approveRequestDetail);

// ปฏิเสธรายการย่อย
router.put("/approval/detail/:request_detail_id/reject", approvalController.rejectRequestDetail);

module.exports = router;
