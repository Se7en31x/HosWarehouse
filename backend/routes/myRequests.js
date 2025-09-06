// routes/myRequest.js
const express = require("express");
const router = express.Router();
const myRequestController = require("../controllers/myRequestController");
const authMiddleware = require("../middleware/auth"); // ✅ import middleware

// ✅ ดึงคำขอของ user (JWT)
router.get(
  "/myRequest",
  authMiddleware(["staff", "doctor", "nurse", "pharmacist"]), // ปรับ role ตามระบบของคุณ
  myRequestController.getMyRequests
);

// ✅ รายละเอียดคำขอ (JWT)
router.get(
  "/myRequestDetail/:id",
  authMiddleware(["staff", "doctor", "nurse", "pharmacist"]),
  myRequestController.getRequestDetailByUser
);

// ✅ ยกเลิกคำขอ (JWT)
router.put(
  "/myRequest/:id/cancel",
  authMiddleware(["staff", "doctor", "nurse", "pharmacist"]),
  myRequestController.cancelRequestById
);

// ✅ ลบคำขอ (JWT)
router.delete(
  "/myRequest/:id",
  authMiddleware(["staff", "doctor", "nurse", "pharmacist"]),
  myRequestController.deleteRequestById
);

module.exports = router;
