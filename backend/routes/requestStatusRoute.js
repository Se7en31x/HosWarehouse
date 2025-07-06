const express = require("express");
const router = express.Router();
const requestStatusController = require("../controllers/requestStatusController");

// ดึงคำขอทั้งหมดพร้อมข้อมูลผู้ใช้
router.get("/requestStatus", requestStatusController.getAllRequestsWithUser);

// อัปเดตสถานะคำขอหลัก
router.put("/requestStatus/:request_id/status", requestStatusController.updateRequestStatus);

// ดึงคำขอหลักพร้อมรายละเอียด
router.get("/requestStatus/:request_id", requestStatusController.getRequestWithDetails);
// อัปเดตสถานะคำขอย่อย (request_details)
router.put("/requestStatus/:request_id/detail-status", requestStatusController.updateRequestDetailStatus);

module.exports = router;
