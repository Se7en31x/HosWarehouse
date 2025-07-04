const requestStatusModel = require("../models/requestStatusModel");

exports.getAllRequestsWithUser = async (req, res) => {
  try {
    const requests = await requestStatusModel.getAllRequestsWithUser();
    res.json(requests);
  } catch (err) {
    console.error("โหลดคำขอล้มเหลว:", err);
    res.status(500).json({ error: "โหลดข้อมูลไม่สำเร็จ" });
  }
};

exports.updateRequestStatus = async (req, res) => {
  const { request_id } = req.params;
  const { newStatus } = req.body;

  try {
    const updated = await requestStatusModel.updateRequestStatus(request_id, newStatus);
    if (!updated) return res.status(404).json({ error: "ไม่พบคำขอ" });
    res.json({ message: "อัปเดตสถานะคำขอเรียบร้อย" });
  } catch (err) {
    console.error("อัปเดตสถานะล้มเหลว:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาด" });
  }
};

exports.getRequestWithDetails = async (req, res) => {
  const { request_id } = req.params;
  try {
    const request = await requestStatusModel.getRequestById(request_id);
    const details = await requestStatusModel.getRequestDetails(request_id);
    if (!request) return res.status(404).json({ error: "ไม่พบคำขอ" });

    res.json({ request, details });
  } catch (err) {
    console.error("ดึงคำขอพร้อมรายละเอียดล้มเหลว:", err);
    res.status(500).json({ error: "ไม่สามารถดึงข้อมูลได้" });
  }
};
