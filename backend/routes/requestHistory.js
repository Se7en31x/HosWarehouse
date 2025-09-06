const express = require("express");
const router = express.Router();
const requestHistoryController = require("../controllers/requestHistoryController");
const authMiddleware = require("../middleware/auth"); // ✅ import middleware

// ✅ GET รายการคำขอทั้งหมด (ผู้ใช้งานทั่วไปเห็นคำขอตัวเอง)
router.get(
  "/my-requests",
  authMiddleware(["doctor", "nurse", "nurse_assistant", "pharmacist"]), 
  requestHistoryController.getAllRequests
);

// ✅ GET รายละเอียดคำขอ (ผู้ใช้งานทั่วไปเห็นรายละเอียดคำขอตัวเอง)
router.get(
  "/my-requests/:id",
  authMiddleware(["doctor", "nurse", "nurse_assistant", "pharmacist"]), 
  requestHistoryController.getRequestById
);

module.exports = router;
