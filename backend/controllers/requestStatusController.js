const ProcessingStatusModel = require("../models/requestStatusModel");
const { getIO } = require("../socket"); // สำหรับ Socket.IO notification

/**
 * ดึงคำขอทั้งหมดพร้อมชื่อผู้ใช้และแผนก สำหรับหน้าจัดการสถานะการดำเนินการ.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
exports.getAllRequestsWithUser = async (req, res) => {
  try {
    // 1. รับ status query parameter จาก Frontend
    const { status } = req.query;
    let allowedStatuses = [];

    if (status) {
      // ถ้ามี status parameter มา ให้แยก string เป็น array
      allowedStatuses = status.split(',');
    } else {
      // ✅ ถ้าไม่มี status parameter มา ให้ใช้ allowedStatuses default ตาม Logic ของหน้าจัดการ
      // ควรระบุให้ชัดเจนว่าสถานะใดบ้างที่หน้านี้ควรแสดงในกรณีที่ไม่มีการกรองจาก Frontend
      // ซึ่งเป็นสถานะที่ "จบการตัดสินใจอนุมัติแล้ว" หรืออยู่ในขั้นตอนดำเนินการ
      allowedStatuses = [
        'approved_all',
        'rejected_all',
        'approved_partial_and_rejected_partial',
        'pending',
        'preparing',
        'delivering',
        'completed',
        'canceled',
      ];
    }

    // 2. ส่ง allowedStatuses ไปยัง Model เพื่อกรองข้อมูลจากฐานข้อมูล
    const requests = await ProcessingStatusModel.getAllRequestsWithUser(allowedStatuses);
    res.json(requests);
  } catch (err) {
    console.error("โหลดคำขอล้มเหลวใน controller:", err);
    res.status(500).json({ error: "โหลดข้อมูลไม่สำเร็จ" });
  }
};

/**
 * ดึงข้อมูลคำขอหลักพร้อมรายละเอียดรายการคำขอทั้งหมด.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
exports.getRequestWithDetails = async (req, res) => {
  const { request_id } = req.params;
  try {
    const request = await ProcessingStatusModel.getRequestById(request_id);
    const details = await ProcessingStatusModel.getRequestDetails(request_id);

    res.json({
      request: request || null, // ให้เป็น null ถ้าไม่พบ request แทน object เปล่า
      details: details || [],
    });
  } catch (err) {
    console.error("ดึงคำขอพร้อมรายละเอียดล้มเหลวใน controller:", err);
    res.status(500).json({ error: "ไม่สามารถดึงข้อมูลได้" });
  }
};

/**
 * อัปเดตสถานะ 'processing_status' ของรายการย่อยและคำนวณสถานะรวมของคำขอหลัก.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
exports.updateRequestDetailProcessingStatus = async (req, res) => {
  const { request_id } = req.params;
  const { request_detail_id, newStatus, userId } = req.body; // รับ userId เพื่อใช้บันทึกประวัติ

  console.log("📥 เข้ามา updateRequestDetailProcessingStatus (Controller)");
  console.log("➡️ request_id (จาก params):", request_id);
  console.log("➡️ request_detail_id (จาก body):", request_detail_id);
  console.log("➡️ newStatus:", newStatus);
  console.log("➡️ userId:", userId);

  try {
    // 1. อัปเดตสถานะ processing_status ของรายการย่อย
    const updatedDetail = await ProcessingStatusModel.updateRequestDetailProcessingStatus(
      request_id,
      request_detail_id,
      newStatus,
      userId // ส่ง userId เข้าไป
    );

    if (!updatedDetail) {
      // หาก updateRequestDetailProcessingStatus คืนค่า false หรือ throw error
      // เพราะไม่พบรายการย่อย หรือสถานะอนุมัติไม่ถูกต้อง
      return res.status(400).json({ error: "ไม่สามารถอัปเดตสถานะได้ อาจเป็นเพราะไม่พบรายการหรือรายการยังไม่ถูกอนุมัติ" });
    }

    // 2. อัปเดตสถานะรวมของคำขอหลักโดยอิงจากสถานะการดำเนินการของรายการย่อย
    await ProcessingStatusModel.updateRequestOverallStatusByProcessingDetails(request_id, userId); // ส่ง userId เข้าไป

    // 3. ดึงข้อมูลรายละเอียดล่าสุด (อาจจะรวมถึงสถานะที่ถูกอัปเดตแล้ว) เพื่อส่งกลับไป Frontend
    const details = await ProcessingStatusModel.getRequestDetails(request_id);
    const request = await ProcessingStatusModel.getRequestById(request_id);


    // 4. ส่ง Socket.IO notification (หากใช้)
    const io = getIO();
    io.emit("requestUpdated", { request_id: parseInt(request_id, 10), newOverallStatus: request.request_status });

    // 5. ส่ง Response กลับไป Frontend
    res.json({
      message: "อัปเดตสถานะดำเนินการรายการย่อยและสถานะคำขอหลักเรียบร้อย",
      overallRequestStatus: request.request_status, // ส่งสถานะ request หลักที่อัปเดตแล้ว
      details: details, // ส่งรายละเอียดรายการย่อยล่าสุด
    });

  } catch (err) {
    console.error("อัปเดตสถานะดำเนินการรายการย่อยล้มเหลวใน controller:", err);
    // ✅ ส่งข้อความ Error จาก Model กลับไป Frontend หากมี
    res.status(500).json({ error: err.message || "เกิดข้อผิดพลาดในการอัปเดตสถานะ" });
  }
};