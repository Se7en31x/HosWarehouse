const ApprovalModel = require("../models/approvalModel");
const { getIO } = require("../socket");

/**
 * ดึงรายละเอียดคำขอสำหรับหน้าอนุมัติ (ทั้งคำขอหลักและรายการย่อย)
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
 * อัปเดตสถานะการอนุมัติ/ปฏิเสธของรายการย่อยหลายรายการพร้อมกัน
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
exports.bulkUpdateRequestDetails = async (req, res, next) => {
  const { request_id } = req.params;
  const { updates } = req.body;   // ❌ เอา userId ออก ไม่ต้องมาจาก body
  const userId = req.user.id;     // ✅ ใช้จาก token แทน

  try {
    const request = await ApprovalModel.getRequestForApproval(request_id);
    if (!request) {
      return res.status(404).json({ error: "ไม่พบคำขอ" });
    }

    if (["preparing", "delivering", "completed", "canceled"].includes(request.request_status)) {
      return res.status(400).json({ error: "ไม่สามารถแก้ไขคำขอได้ เนื่องจากอยู่ในสถานะขั้นตอนถัดไป" });
    }

    // ใช้ Promise.all เพื่ออัปเดตรายการย่อยพร้อมกัน
    const updatePromises = updates.map(update => {
      const { request_detail_id, status, approved_qty, note } = update;
      return ApprovalModel.updateRequestDetailApprovalStatus(
        request_detail_id,
        status,
        approved_qty,
        userId,       // ✅ ใช้ userId จาก token
        note || null
      );
    });

    await Promise.all(updatePromises);

    await ApprovalModel.updateRequestOverallStatusByDetails(request_id, userId);

    const io = getIO();
    io.emit("requestUpdated", { request_id });

    res.status(200).json({ message: "บันทึกการอนุมัติ/ปฏิเสธรายการย่อยเรียบร้อยแล้ว" });

  } catch (err) {
    console.error("Error in bulkUpdateRequestDetails:", err);
    res.status(500).json({ error: err.message || "เกิดข้อผิดพลาดในการบันทึก" });
  }
};
