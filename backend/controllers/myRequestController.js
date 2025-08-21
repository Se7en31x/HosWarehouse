// controllers/myRequestController.js
const myRequestModel = require("../models/myRequestModel");

// GET /my-requests
exports.getMyRequests = async (req, res) => {
  try {
    const userId = parseInt(req.query.user_id, 10);
    const rows = await myRequestModel.getMyRequests(userId);
    res.json(rows);
  } catch (err) {
    console.error("getMyRequests error:", err);
    res.status(500).json({ error: "ไม่สามารถดึงคำขอได้" });
  }
};

// GET /my-request-detail/:id
exports.getRequestDetailByUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.query.user_id || req.user?.user_id;

    const row = await myRequestModel.getRequestDetailByUser(id, userId);
    if (!row) return res.status(404).json({ message: "ไม่พบคำขอ" });

    const { items, ...detail } = row; // แยกออก
    res.json({ detail, items });
  } catch (err) {
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

// PUT /my-requests/:id/cancel
exports.cancelRequestById = async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    const userId = parseInt(req.body.user_id, 10);
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
    // mock user_id ตายตัว
    const userId = 1;

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
