const myRequestModel = require("../models/myRequestModel");

exports.getMyRequests = async (req, res) => {
  try {
    const userId = req.query.user_id;
    if (!userId) {
      return res.status(400).json({ error: "กรุณาระบุ user_id" });
    }

    const requests = await myRequestModel.getMyRequests(userId);
    res.json(requests);
  } catch (error) {
    console.error("Error fetching my requests:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์" });
  }
};


exports.cancelRequest = async (req, res) => {
  const requestId = parseInt(req.params.id);
  const userId = parseInt(req.body.user_id);

  try {
    const success = await myRequestModel.cancelRequestById(requestId, userId);
    if (success) {
      res.status(200).json({ message: "ยกเลิกคำขอสำเร็จ" });
    } else {
      res.status(400).json({ error: "ไม่สามารถยกเลิกคำขอได้" });
    }
  } catch (err) {
    console.error("Error canceling request:", err);
    res.status(500).json({ error: "Server error" });
  }
};


///////////////////////////////////////edit page///////////////////////////////////////////////
// controllers/myRequestsController.js
exports.getSingleRequest = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT request_id, request_code, request_note, is_urgent, request_types
       FROM requests WHERE request_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบคำขอ' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('getSingleRequest error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดฝั่งเซิร์ฟเวอร์' });
  }
};

// controllers/myRequestsController.js
exports.updateRequest = async (req, res) => {
  const { id } = req.params;
  const { request_note, is_urgent, request_types } = req.body;

  try {
    const result = await pool.query(
      `UPDATE requests
       SET request_note = $1,
           is_urgent = $2,
           request_types = $3
       WHERE request_id = $4
       RETURNING *`,
      [request_note, is_urgent, request_types, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'ไม่พบคำขอที่จะแก้ไข' });
    }

    res.json({ message: 'อัปเดตเรียบร้อย', request: result.rows[0] });
  } catch (err) {
    console.error('updateRequest error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตคำขอ' });
  }
};
