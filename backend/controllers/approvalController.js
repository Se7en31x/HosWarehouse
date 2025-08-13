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
    const { updates, userId } = req.body;

    try {
        // 1. ตรวจสอบสถานะคำขอหลักก่อนดำเนินการ
        const request = await ApprovalModel.getRequestForApproval(request_id);
        if (!request) {
            return res.status(404).json({ error: "ไม่พบคำขอ" });
        }

        // ป้องกันการแก้ไขคำขอที่เข้าสู่ขั้นตอนการดำเนินการแล้ว
        if (["preparing", "delivering", "completed", "canceled"].includes(request.request_status)) {
            return res.status(400).json({ error: "ไม่สามารถแก้ไขคำขอได้ เนื่องจากอยู่ในสถานะขั้นตอนถัดไป" });
        }

        // 2. ใช้ Promise.all เพื่ออัปเดตรายการย่อยพร้อมกัน (ประสิทธิภาพดีกว่า)
        const updatePromises = updates.map(update => {
            const { request_detail_id, status, approved_qty, note } = update;
            return ApprovalModel.updateRequestDetailApprovalStatus(
                request_detail_id,
                status,
                approved_qty,
                userId,
                note || null
            );
        });

        // รอให้ทุกรายการย่อยอัปเดตเสร็จสิ้น
        await Promise.all(updatePromises);

        // 3. หลังจากอัปเดตรายการย่อยทั้งหมดแล้ว ให้คำนวณและอัปเดตสถานะคำขอหลัก
        await ApprovalModel.updateRequestOverallStatusByDetails(request_id, userId);

        // 4. ส่ง Socket.IO notification (optional)
        const io = getIO();
        io.emit("requestUpdated", { request_id });

        // 5. ส่ง Response กลับไปให้ Frontend เมื่อทุกอย่างสำเร็จ
        res.status(200).json({ message: "บันทึกการอนุมัติ/ปฏิเสธรายการย่อยเรียบร้อยแล้ว" });

    } catch (err) {
        console.error("Error in bulkUpdateRequestDetails:", err);
        // ใช้ next(err) เพื่อให้ Error Handler Middleware ทำงาน
        // หรือส่ง Response กลับไปทันที
        res.status(500).json({ error: err.message || "เกิดข้อผิดพลาดในการบันทึก" });
    }
};