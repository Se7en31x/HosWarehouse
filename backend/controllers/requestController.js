const RequestModel = require("../models/requestModel"); 

/**
 * จัดการการสร้างคำขอใหม่และรายการย่อยที่เกี่ยวข้อง
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
exports.handleCreateRequest = async (req, res) => {
  try {
    const { user_id, note, urgent, date, type, items } = req.body;

    // 1. สร้างคำขอหลักโดยเรียกใช้ Model
    const requestResult = await RequestModel.createRequest({
      user_id,
      note,
      urgent,
      date,
      type,
    });

    if (!requestResult || !requestResult.request_id) {
      return res.status(500).json({ error: "Failed to create request" });
    }

    const { request_id, request_code } = requestResult;

    // 2. เพิ่มรายการย่อยทั้งหมดโดยเรียกใช้ Model
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const itemExpectedReturnDate =
          item.action === "borrow" ? item.returnDate : null;

        await RequestModel.addRequestDetail({
          request_id,
          item_id: item.id || item.item_id,
          quantity: item.quantity,
          request_detail_type: item.action || "withdraw",
          user_id: user_id,
          expected_return_date: itemExpectedReturnDate,
        });
      }
    }

    // ❌ ตัด io.emit ออก
    // ✅ ปล่อยให้ Notification system ดูแลการแจ้งเตือน

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
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
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
