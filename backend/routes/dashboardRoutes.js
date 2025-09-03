const express = require("express");
const {
  getSummary,
  getMonthly,
  getCategory,
  getMovements,
} = require("../controllers/dashboardController");
const authMiddleware = require("../middleware/auth"); // ✅ ใช้ไฟล์ auth.js ที่คุณมีแล้ว

const router = express.Router();

// 🔐 ใส่ middleware → เฉพาะ role manage เข้าได้
router.get("/dashboard/summary", authMiddleware(["marehouse_manager"]), getSummary);
router.get("/dashboard/monthly", authMiddleware(["marehouse_manager"]), getMonthly);
router.get("/dashboard/category", authMiddleware(["marehouse_manager"]), getCategory);
router.get("/dashboard/movements", authMiddleware(["marehouse_manager"]), getMovements);

module.exports = router;
