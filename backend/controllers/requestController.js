const RequestModel = require("../models/requestModel"); 

/**
 * จัดการการสร้างคำขอใหม่และรายการย่อยที่เกี่ยวข้อง
 */
exports.handleCreateRequest = async (req, res) => {
  try {
    const { note, urgent, date, type, items } = req.body;
    const userId = parseInt(req.user?.id, 10); // ✅ ใช้ id จาก token และแปลงเป็น int

    if (!userId || isNaN(userId)) {
      return res.status(401).json({ error: "Unauthorized: missing or invalid user id" });
    }

    // 1. สร้างคำขอหลัก
    const requestResult = await RequestModel.createRequest({
      user_id: userId,
      note,
      urgent,
      date,
      type,
    });

    if (!requestResult || !requestResult.request_id) {
      return res.status(500).json({ error: "Failed to create request" });
    }

    const { request_id, request_code } = requestResult;

    // 2. เพิ่มรายการย่อย
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const itemExpectedReturnDate =
          item.action === "borrow" ? item.returnDate : null;

        await RequestModel.addRequestDetail({
          request_id,
          item_id: item.id || item.item_id,
          quantity: item.quantity,
          request_detail_type: item.action || "withdraw",
          user_id: userId, // ✅ ใช้ user token เหมือนกัน
          expected_return_date: itemExpectedReturnDate,
        });
      }
    }

    res.status(201).json({
      requestId: request_id,
      requestCode: request_code,
    });
  } catch (err) {
    console.error("Error creating request:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการสร้างคำขอ" });
  }
};

/**
 * ดึงคำขอตามพารามิเตอร์ query สำหรับสถานะ
 */
exports.getRequests = async (req, res) => {
  try {
    const defaultStatuses = [
      "waiting_approval",
      "approved_all",
      "rejected_all",
      "approved_partial",
      "rejected_partial",
      "approved_partial_and_rejected_partial",
      "completed",
    ];

    const statusParam = req.query.status || defaultStatuses.join(",");
    const statuses = statusParam.split(",");

    const data = await RequestModel.getRequestsByStatus(statuses);
    res.json(data);
  } catch (err) {
    console.error("Error fetching requests:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
  }
};
