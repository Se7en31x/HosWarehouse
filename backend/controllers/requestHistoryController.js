const requestHistoryModel = require("../models/requestHistoryModel");

// ✅ GET /api/my-requests
exports.getAllRequests = async (req, res) => {
  try {
    const userId = req.user?.id; // 🔧 ใช้ id จาก JWT
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const data = await requestHistoryModel.getAllRequests(userId);
    res.status(200).json(data);
  } catch (err) {
    console.error("getAllRequests error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

// ✅ GET /api/my-requests/:id
exports.getRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id; // 🔧 ตรงนี้ก็ใช้ id จาก JWT
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const data = await requestHistoryModel.getRequestById(id, userId); 
    if (!data) {
      return res.status(404).json({ message: "ไม่พบคำขอหรือคุณไม่มีสิทธิ์เข้าถึง" });
    }
    res.status(200).json(data);
  } catch (err) {
    console.error("getRequestById error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};
