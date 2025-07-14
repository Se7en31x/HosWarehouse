const ApprovalModel = require("../models/approvalModel"); // ตรวจสอบว่าเส้นทางถูกต้อง
const { getIO } = require("../socket"); // สำหรับ Socket.IO notification

/**
 * ดึงรายละเอียดคำขอสำหรับหน้าอนุมัติ (ทั้งคำขอหลักและรายการย่อย)
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
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

/**
 * อัปเดตสถานะการอนุมัติ (approval_status) ของรายการย่อยหลายรายการพร้อมกัน
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
exports.bulkUpdateRequestDetails = async (req, res) => {
  const { request_id } = req.params;
  const { updates, userId } = req.body; // updates: [{ request_detail_id, status, note }]

  try {
    // 1. ตรวจสอบสถานะคำขอหลักก่อนดำเนินการ
    const request = await ApprovalModel.getRequestForApproval(request_id);
    if (!request) return res.status(404).json({ error: "ไม่พบคำขอ" });

    // ป้องกันการแก้ไขคำขอที่เข้าสู่ขั้นตอนการดำเนินการแล้ว
    if (["preparing", "delivering", "completed", "canceled"].includes(request.request_status)) {
      return res.status(400).json({ error: "ไม่สามารถแก้ไขคำขอได้ เนื่องจากอยู่ในสถานะขั้นตอนถัดไป" });
    }

    // 2. วนลูปอัปเดตแต่ละรายการย่อย
    for (const update of updates) {
      const { request_detail_id, status, note } = update; // status คือ 'approved' หรือ 'rejected'
      await ApprovalModel.updateRequestDetailApprovalStatus(request_detail_id, status, userId, note || null);
    }

    // 3. หลังจากอัปเดตรายการย่อยทั้งหมดแล้ว ให้คำนวณและอัปเดตสถานะคำขอหลัก
    // Logic การคำนวณสถานะรวมที่ได้รับการปรับปรุง จะอยู่ใน ApprovalModel
    await ApprovalModel.updateRequestOverallStatusByDetails(request_id, userId);

    // 4. ส่ง Socket.IO notification
    const io = getIO();
    io.emit("requestUpdated"); // อาจจะส่ง request_id ไปด้วย

    res.json({ message: "บันทึกการอนุมัติ/ปฏิเสธรายการย่อยเรียบร้อยแล้ว" });
  } catch (err) {
    console.error("Error in bulkUpdateRequestDetails:", err);
    res.status(500).json({ error: err.message || "เกิดข้อผิดพลาดในการบันทึก" }); // ส่ง err.message เพื่อให้เห็นข้อความ error ที่ชัดเจนขึ้น
  }
};