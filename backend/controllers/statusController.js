// controllers/statusController.js
const statusModel = require('../models/statusModel');

exports.getStatus = async (req, res) => {
  try {
    const userId = req.user?.user_id || 1; // mock user
    const { status } = req.query;

    const requests = await statusModel.getRequestsByStatus({ userId, status });

    res.json(requests);
  } catch (error) {
    console.error("❌ getStatus error:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล", error: error.message });
  }
};
