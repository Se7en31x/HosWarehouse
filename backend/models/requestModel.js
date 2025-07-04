const { pool } = require("../config/db");

const generateRequestCode = async () => {
  const result = await pool.query(`SELECT COUNT(*) FROM requests`);
  const count = parseInt(result.rows[0].count || '0') + 1;
  const padded = count.toString().padStart(5, '0');
  return `REQ-${padded}`;
};

exports.createRequest = async ({ user_id, note, urgent, date, type }) => {
  console.log('createRequest input:', { user_id, note, urgent, date, type });

  try {
    const code = await generateRequestCode();

    const result = await pool.query(
      `INSERT INTO requests 
       (request_code, user_id, request_status, request_note, is_urgent, request_due_date, request_date, request_type)
       VALUES ($1, $2, 'รอดำเนินการ', $3, $4, $5, NOW(), $6)
       RETURNING request_id, request_code`,
      [code, user_id, note, urgent, date, type]
    );

    console.log('createRequest result:', result.rows[0]);

    return result.rows[0]; // { request_id, request_code }
  } catch (err) {
    console.error("Error in createRequest:", err);
    throw err;
  }
};

//////////////////////////////////////////////////////////////////////////
// ✅ ไม่มีอะไรต้องแก้ใน model ถ้า query ยังใช้ SELECT อย่างเดียว
exports.getPendingRequests = async () => {
  const query = `
  SELECT 
    r.request_id,
    r.request_date,
    r.request_status,
    u.user_name,
    u.department,
    STRING_AGG(DISTINCT
      CASE 
        WHEN rd.request_detail_type = 'borrow' THEN 'ยืม'
        WHEN rd.request_detail_type = 'withdraw' THEN 'เบิก'
        ELSE rd.request_detail_type
      END,
      ','
    ) AS request_types,
    COUNT(rd.request_detail_id) AS item_count
  FROM requests r
  JOIN users u ON r.user_id = u.user_id
  LEFT JOIN request_details rd ON r.request_id = rd.request_id
  WHERE r.request_status = 'รอดำเนินการ'
  GROUP BY r.request_id, r.request_date, r.request_status, u.user_name, u.department
  ORDER BY r.request_date DESC;
`;

  const result = await pool.query(query);
  return result.rows;
};

exports.addRequestDetail = async ({ request_id, item_id, quantity, request_detail_type }) => {
  try {
    await pool.query(
      `INSERT INTO request_details (request_id, item_id, requested_qty, request_detail_type, request_detail_status)
       VALUES ($1, $2, $3, $4, 'pending')`,
      [request_id, item_id, quantity, request_detail_type]
    );
  } catch (err) {
    console.error("Error in addRequestDetail:", err);
    throw err;
  }
};




