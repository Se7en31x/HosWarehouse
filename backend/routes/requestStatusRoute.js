const express = require("express");
const router = express.Router();
const requestStatusController = require("../controllers/requestStatusController"); // ใช้ชื่อ controller ให้ตรง

// ดึงคำขอทั้งหมดพร้อมข้อมูลผู้ใช้ (สำหรับหน้ารวม)
router.get("/requestStatus", requestStatusController.getAllRequestsWithUser);

// ดึงคำขอหลักพร้อมรายละเอียด (สำหรับหน้าติดตามสถานะการดำเนินการ)
router.get("/requestStatus/:request_id", requestStatusController.getRequestWithDetails);

// อัปเดตสถานะคำขอย่อย (processing_status) - แก้ไขตรงนี้
router.put("/requestStatus/:request_id/processing-status", requestStatusController.updateRequestDetailProcessingStatus); // <--- เปลี่ยน /detail-status เป็น /processing-status

// คุณอาจมี routes อื่นๆ ที่เคยอยู่ในไฟล์นี้ เช่น updateRequestStatus
// ถ้ามี ก็วางกลับมาที่นี่ด้วย
// router.put("/requestStatus/:request_id/status", requestStatusController.updateRequestStatus);

module.exports = router;