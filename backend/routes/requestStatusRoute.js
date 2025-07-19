const express = require("express");
const router = express.Router();
const requestStatusController = require("../controllers/requestStatusController"); // ยังคงเก็บไว้สำหรับ functions อื่นๆ
// *** Import stockDeductionController เพราะมันมี Logic สำหรับ processStockDeduction ที่ต้องการ
const stockDeductionController = require("../controllers/stockDeductionController");

// ดึงคำขอทั้งหมดพร้อมข้อมูลผู้ใช้ (สำหรับหน้ารวม)
router.get("/requestStatus", requestStatusController.getAllRequestsWithUser);

// ดึงคำขอหลักพร้อมรายละเอียด (สำหรับหน้าติดตามสถานะการดำเนินการ)
router.get("/requestStatus/:request_id", requestStatusController.getRequestWithDetails);

// *** แก้ไขตรงนี้: เปลี่ยน endpoint ให้ตรงกับ Frontend และชี้ไปที่ Controller ที่เหมาะสม ***
// Frontend เรียก /processing-status-batch
// Logic ในการอัปเดตสถานะและตัดสต็อกอยู่ใน stockDeductionController.processStockDeduction
router.put("/requestStatus/:request_id/processing-status-batch", stockDeductionController.processStockDeduction);

// (ถ้าคุณมี router.put("/requestStatus/:request_id/processing-status", ...); ตัวเก่าที่ไม่ใช่ batch update
// และไม่ต้องการใช้แล้ว สามารถลบออกได้)

module.exports = router;