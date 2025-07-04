const express = require("express");
const router = express.Router();
const requestStatusController = require("../controllers/requestStatusController");

// ดึงคำขอทั้งหมดพร้อมข้อมูลผู้ใช้
router.get("/requestStstus", requestStatusController.getAllRequestsWithUser);

// อัปเดตสถานะคำขอหลัก
router.put("/requestStstus/:request_id/status", requestStatusController.updateRequestStatus);

// ดึงคำขอหลักพร้อมรายละเอียด
router.get("/requestStstus/:request_id", requestStatusController.getRequestWithDetails);

module.exports = router;
