// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const { getProfile } = require("../controllers/userController");

// ✅ แค่ login แล้วมี token -> ดึง profile ได้
router.get("/profile", authMiddleware(), getProfile);

module.exports = router;
