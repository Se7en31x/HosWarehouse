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

    // ❌ แบบเดิม ทำให้หน้า frontend ไม่แสดงเลย
    // if (!request) return res.status(404).json({ error: "ไม่พบคำขอ" });

    // ✅ แบบใหม่: ส่ง response กลับเสมอแม้ไม่มี request
    res.json({
      request: request || { request_status: 'pending' }, // ให้ fallback status
      details: details || [],
    });
  } catch (err) {
    console.error("ดึงคำขอพร้อมรายละเอียดล้มเหลว:", err);
    res.status(500).json({ error: "ไม่สามารถดึงข้อมูลได้" });
  }
};


exports.updateRequestDetailStatus = async (req, res) => {
  const { request_id } = req.params;
  const { detailId, newStatus } = req.body;
  console.log("📥 เข้ามา updateRequestDetailStatus");
  console.log("➡️ request_id:", request_id);
  console.log("➡️ detailId:", detailId);
  console.log("➡️ newStatus:", newStatus);
  try {
    // อัปเดตสถานะของรายการย่อยที่ระบุ
    const updated = await requestStatusModel.updateRequestDetailStatus(detailId, newStatus);
    if (!updated) return res.status(404).json({ error: "ไม่พบรายการคำขอย่อย" });

    // ถ้าต้องการเปลี่ยนสถานะทุกรายการในคำขอ เป็นสถานะเดียวกัน (option)
    // await requestStatusModel.updateAllRequestDetailsStatus(request_id, newStatus);

    // ดึงสถานะล่าสุดของทุกรายการ
    const details = await requestStatusModel.getRequestDetails(request_id);

    // คำนวณสถานะรวม
    const statusSteps = ['pending', 'preparing', 'delivering', 'completed'];

    const indexes = details.map(d => statusSteps.indexOf(d.request_detail_status)).filter(i => i !== -1);
    if (indexes.length === 0) {
      return res.status(400).json({ error: "สถานะรายการไม่ถูกต้อง" });
    }
    const minIndex = Math.min(...indexes);
    const overallStatus = statusSteps[minIndex];

    // อัปเดตสถานะรวมคำขอหลัก
    await requestStatusModel.updateRequestStatus(request_id, overallStatus);

    res.json({ message: "อัปเดตสถานะคำขอย่อยและสถานะคำขอหลักเรียบร้อย", overallStatus, details });
  } catch (err) {
    console.error("อัปเดตสถานะคำขอย่อยล้มเหลว:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาด" });
  }
};


