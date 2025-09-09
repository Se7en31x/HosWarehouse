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
router.get("/dashboard/summary", authMiddleware(["warehouse_manager"]), getSummary);
router.get("/dashboard/monthly", authMiddleware(["warehouse_manager"]), getMonthly);
router.get("/dashboard/category", authMiddleware(["warehouse_manager"]), getCategory);
router.get("/dashboard/movements", authMiddleware(["warehouse_manager"]), getMovements);

module.exports = router;
