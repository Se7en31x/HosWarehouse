const RequestModel = require("../models/requestModel");
const { getIO } = require("../socket");

exports.handleCreateRequest = async (req, res) => {
  try {
    const requestResult = await RequestModel.createRequest(req.body);

    if (!requestResult || !requestResult.request_id) {
      return res.status(500).json({ error: "Failed to create request" });
    }

    const { request_id, request_code } = requestResult;

    const items = req.body.items || [];
    for (const item of items) {
      await RequestModel.addRequestDetail({
        request_id,
        item_id: item.id || item.item_id,
        quantity: item.quantity,
        request_detail_type: item.action || 'withdraw',
      });
    }

    const io = getIO();
    io.emit('requestUpdated');

    res.status(201).json({ requestId: request_id, requestCode: request_code });
  } catch (err) {
    console.error("Error creating request:", err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างคำขอ' });
  }
};


exports.createRequest = async ({ user_id, note, urgent, date, type }) => {
  try {
    const code = await generateRequestCode();

    const result = await pool.query(
      `INSERT INTO requests 
       (request_code, user_id, request_status, request_note, is_urgent, request_due_date, request_date, request_type)
       VALUES ($1, $2, 'pending', $3, $4, $5, NOW(), $6)
       RETURNING request_id, request_code`,
      [code, user_id, note, urgent, date, type]
    );

    return result.rows[0];
  } catch (err) {
    console.error("Error in createRequest:", err);
    throw err;
  }
};


const generateRequestCode = async () => {
  const result = await pool.query(`SELECT COUNT(*) FROM requests`);
  const count = parseInt(result.rows[0].count || '0') + 1;
  const padded = count.toString().padStart(5, '0');
  return `REQ-${padded}`;
};


exports.getRequests = async (req, res) => {
  try {
    const statusParam = req.query.status || 'waiting_approval,approved_all,rejected_all';
    const statuses = statusParam.split(',');
    const data = await RequestModel.getPendingRequests(statuses);
    res.json(data);
  } catch (err) {
    console.error('Error fetching requests:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
  }
};

