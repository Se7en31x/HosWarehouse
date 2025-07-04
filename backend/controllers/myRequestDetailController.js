const myRequestModel = require('../models/myRequestModel');

exports.getMyRequestDetail = async (req, res) => {
  try {
    const requestId = req.params.id;
    const userId = req.query.user_id;

    if (!userId) {
      return res.status(400).json({ error: 'กรุณาระบุ user_id' });
    }

    const detail = await myRequestModel.getRequestDetailByUser(requestId, userId);
    if (!detail) {
      return res.status(404).json({ error: 'ไม่พบคำขอ' });
    }

    const items = await myRequestModel.getItemsInRequest(requestId);

    res.json({ detail, items });
  } catch (error) {
    console.error('Error fetching request detail:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์' });
  }
};

exports.updateMyRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const userId = req.body.user_id;

    const {
      note,
      urgent,
      date,
      items = [],
      itemsToDelete = [],
    } = req.body;

    // 1. อัปเดตข้อมูลคำขอหลัก
    const updated = await myRequestModel.updateRequestById(
      requestId,
      userId,
      {
        request_note: note,
        is_urgent: urgent,
        request_types: [...new Set(items.map(i => i.action))].join(","),
      }
    );

    if (!updated) {
      return res.status(404).json({ error: "ไม่สามารถอัปเดตคำขอได้" });
    }

    // 2. อัปเดตรายการเดิม
    const oldItems = items.filter(i => i.request_detail_id);
    await myRequestModel.updateRequestItems(oldItems);

    // 3. ลบรายการที่ถูกลบออก
    await myRequestModel.deleteRequestDetails(itemsToDelete, requestId);

    // (4. ไม่รองรับการเพิ่มรายการใหม่ตามที่คุณสั่งไว้ ไม่ต้องทำ INSERT)

    res.json({ message: "อัปเดตคำขอสำเร็จ", request: updated });
  } catch (error) {
    console.error("Error updating request:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์" });
  }
};

