// controllers/myRequestController.js
const myRequestModel = require("../models/myRequestModel");

// GET /my-requests
exports.getMyRequests = async (req, res) => {
  try {
    const userId = req.user?.id; // ✅ ใช้ id จาก JWT
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const rows = await myRequestModel.getMyRequests(userId);
    res.json(rows || []); // ✅ ส่ง [] ถ้าไม่มีคำขอ
  } catch (err) {
    console.error("getMyRequests error:", err);
    res.status(500).json({ error: "ไม่สามารถดึงคำขอได้" });
  }
};

// GET /my-request-detail/:id
exports.getRequestDetailByUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id; // ✅ ใช้ id จาก JWT

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const row = await myRequestModel.getRequestDetailByUser(id, userId);
    if (!row) return res.status(404).json({ message: "ไม่พบคำขอ" });

    const { items, ...detail } = row;
    res.json({ detail, items });
  } catch (err) {
    console.error("getRequestDetailByUser error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

// PUT /my-requests/:id/cancel
exports.cancelRequestById = async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    const userId = req.user?.id; // ✅ ใช้ id จาก JWT

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const success = await myRequestModel.cancelRequestById(requestId, userId);
    if (!success) return res.status(400).json({ error: "ไม่สามารถยกเลิกได้" });

    res.json({ message: "ยกเลิกคำขอสำเร็จ" });
  } catch (err) {
    console.error("cancelRequest error:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาด" });
  }
};

// DELETE /my-requests/:id
exports.deleteRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id; // ✅ ใช้ id จาก JWT

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const success = await myRequestModel.deleteRequestById(id, userId);
    if (!success) {
      return res.status(404).json({ message: "ไม่พบคำขอหรือไม่สามารถลบได้" });
    }

    res.json({ message: "ลบคำขอเรียบร้อย" });
  } catch (err) {
    console.error("deleteRequest error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};
