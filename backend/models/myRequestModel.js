const { pool } = require("../config/db");

exports.getMyRequests = async (userId) => {
  const query = `
    SELECT 
      r.request_id,
      r.request_code,  -- ✅ เพิ่มมาเพื่อให้ดึงรหัสคำขอ
      r.request_date,
      r.request_status,
      STRING_AGG(DISTINCT rd.request_detail_type, ',') AS request_types,
      COUNT(rd.request_detail_id) AS item_count
    FROM requests r
    LEFT JOIN request_details rd ON r.request_id = rd.request_id
    WHERE r.user_id = $1
    GROUP BY r.request_id, r.request_code, r.request_date, r.request_status
    ORDER BY r.request_date DESC;
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
};



exports.cancelRequestById = async (requestId, userId) => {
  const query = `
    UPDATE requests
    SET request_status = 'ยกเลิกโดยผู้ใช้'
    WHERE request_id = $1 AND user_id = $2 AND request_status = 'รอดำเนินการ'
    RETURNING *;
  `;
  const result = await pool.query(query, [requestId, userId]);
  return result.rowCount > 0;
};

////////////////////////////////request detail//////////////////////////////////////

exports.getRequestDetailByUser = async (requestId, userId) => {
  const query = `
    SELECT r.*, u.user_name AS user_name, u.department
    FROM requests r
    JOIN users u ON r.user_id = u.user_id
    WHERE r.request_id = $1 AND r.user_id = $2
  `;

  const { rows } = await pool.query(query, [requestId, userId]);
  return rows[0];
};



exports.getItemsInRequest = async (requestId) => {
  const query = `
    SELECT 
      rd.request_detail_id,
      rd.item_id,
      rd.requested_qty AS quantity,
      i.item_unit AS unit,
      i.item_name,
      i.item_img,
      rd.request_detail_type
    FROM request_details rd
    JOIN items i ON rd.item_id = i.item_id
    WHERE rd.request_id = $1
  `;

  const { rows } = await pool.query(query, [requestId]);
  return rows;
};

/////////////////////////////////////////////////////////////////////////////////
exports.updateRequestById = async (requestId, userId, { request_note, is_urgent, request_types }) => {
  const query = `
    UPDATE requests
    SET request_note = $1,
        is_urgent = $2,
        request_type = $3
    WHERE request_id = $4 AND user_id = $5 AND request_status = 'รอดำเนินการ'
    RETURNING *;
  `;
  const values = [request_note, is_urgent, request_types, requestId, userId];

  const result = await pool.query(query, values);
  return result.rows[0]; // จะคืน undefined ถ้าไม่เจอหรือไม่ได้แก้
};

exports.getRequestById = async (requestId, userId) => {
  const query = `
    SELECT request_id, request_code, request_note, is_urgent, request_types
    FROM requests
    WHERE request_id = $1 AND user_id = $2
  `;
  const result = await pool.query(query, [requestId, userId]);
  return result.rows[0]; // คืน undefined ถ้าไม่เจอ
};

// 🔄 ลบ request_details ที่ผู้ใช้ลบออก
exports.deleteRequestDetails = async (requestDetailIds, requestId) => {
  if (!requestDetailIds.length) return;
  const query = `
    DELETE FROM request_details 
    WHERE request_detail_id = ANY($1) AND request_id = $2;
  `;
  await pool.query(query, [requestDetailIds, requestId]);
};

// 🔁 อัปเดตจำนวนและประเภทของรายการเดิม
exports.updateRequestItems = async (items) => {
  const queries = items.map(i => {
    return pool.query(
      `
      UPDATE request_details
      SET requested_qty = $1, request_detail_type = $2
      WHERE request_detail_id = $3
    `,
      [i.quantity, i.action, i.request_detail_id]
    );
  });
  await Promise.all(queries);
};




