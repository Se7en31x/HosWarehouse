const ApprovalModel = require("../models/approvalModel");
const { getIO } = require("../socket");

// ดึงรายละเอียดคำขอสำหรับอนุมัติ
exports.getApprovalDetail = async (req, res) => {
  const { request_id } = req.params;
  try {
    const request = await ApprovalModel.getRequestForApproval(request_id);
    if (!request) return res.status(404).json({ error: "ไม่พบคำขอ" });

    const details = await ApprovalModel.getRequestDetails(request_id);
    res.json({ request, details });
  } catch (err) {
    console.error("Error fetching approval detail:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการโหลดข้อมูล" });
  }
};

// อนุมัติคำขอทั้งหมด
exports.approveRequest = async (req, res) => {
  const { request_id } = req.params;
  try {
    const details = await ApprovalModel.getRequestDetails(request_id);
    if (details.length === 0) return res.status(404).json({ error: "ไม่พบรายการคำขอ" });

    for (const detail of details) {
      await ApprovalModel.updateRequestDetailStatus(detail.request_detail_id, "approved");
    }

    await ApprovalModel.updateRequestStatusByDetails(request_id);

    const io = getIO();
    io.emit("requestUpdated");

    res.json({ message: "อนุมัติคำขอเรียบร้อยแล้ว" });
  } catch (err) {
    console.error("Error approving request:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการอนุมัติ" });
  }
};

// ปฏิเสธคำขอทั้งหมด
exports.rejectRequest = async (req, res) => {
  const { request_id } = req.params;
  try {
    const details = await ApprovalModel.getRequestDetails(request_id);
    if (details.length === 0) return res.status(404).json({ error: "ไม่พบรายการคำขอ" });

    for (const detail of details) {
      await ApprovalModel.updateRequestDetailStatus(detail.request_detail_id, "rejected");
    }

    await ApprovalModel.updateRequestStatusByDetails(request_id);

    const io = getIO();
    io.emit("requestUpdated");

    res.json({ message: "ปฏิเสธคำขอเรียบร้อยแล้ว" });
  } catch (err) {
    console.error("Error rejecting request:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการปฏิเสธ" });
  }
};

// อนุมัติรายการย่อย
exports.approveRequestDetail = async (req, res) => {
  const { request_detail_id } = req.params;

  try {
    const request_id = await ApprovalModel.getRequestIdByDetailId(request_detail_id);
    const request = await ApprovalModel.getRequestForApproval(request_id);

    // ✅ ป้องกันการแก้ไขหากสถานะรวมเลยขั้นตอนอนุมัติไปแล้ว
    if (!['pending', 'waiting_approval'].includes(request.request_status)) {
      return res.status(400).json({ error: "ไม่สามารถอนุมัติได้ เนื่องจากคำขออยู่ระหว่างการจัดเตรียมแล้ว" });
    }

    // ✅ อนุมัติซ้ำได้ ไม่ต้องเช็คสถานะเดิม
    const success = await ApprovalModel.updateRequestDetailStatus(request_detail_id, "approved");
    if (!success) return res.status(404).json({ error: "ไม่พบรายการ" });

    await ApprovalModel.updateRequestStatusByDetails(request_id);

    const io = getIO();
    io.emit("requestUpdated");

    res.json({ message: "อนุมัติรายการย่อยเรียบร้อยแล้ว" });
  } catch (err) {
    console.error("Error approving request detail:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการอนุมัติรายการย่อย" });
  }
};

// ปฏิเสธรายการย่อย
exports.rejectRequestDetail = async (req, res) => {
  const { request_detail_id } = req.params;

  try {
    const request_id = await ApprovalModel.getRequestIdByDetailId(request_detail_id);
    const request = await ApprovalModel.getRequestForApproval(request_id);

    // ✅ ป้องกันการแก้ไขหากสถานะรวมเลยขั้นตอนอนุมัติไปแล้ว
    if (!['pending', 'waiting_approval'].includes(request.request_status)) {
      return res.status(400).json({ error: "ไม่สามารถปฏิเสธได้ เนื่องจากคำขออยู่ระหว่างการจัดเตรียมแล้ว" });
    }

    // ✅ ปฏิเสธซ้ำได้ ไม่ต้องเช็คสถานะเดิม
    const success = await ApprovalModel.updateRequestDetailStatus(request_detail_id, "rejected");
    if (!success) return res.status(404).json({ error: "ไม่พบรายการ" });

    await ApprovalModel.updateRequestStatusByDetails(request_id);

    const io = getIO();
    io.emit("requestUpdated");

    res.json({ message: "ปฏิเสธรายการย่อยเรียบร้อยแล้ว" });
  } catch (err) {
    console.error("Error rejecting request detail:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการปฏิเสธรายการย่อย" });
  }
};
