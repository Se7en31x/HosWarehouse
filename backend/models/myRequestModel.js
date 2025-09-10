const { pool } = require("../config/db");

// ─────────────────────────────────────────────
// 1. ดึงรายการคำขอ (list)
exports.getMyRequests = async (userId) => {
  const query = `
    SELECT
      r.request_id,
      r.request_code,
      r.request_date,
      r.request_status,
      r.is_urgent,
      COALESCE(STRING_AGG(DISTINCT rd.request_detail_type, ','), '') AS request_types,
      COUNT(rd.request_detail_id) AS item_count
    FROM requests r
    LEFT JOIN request_details rd ON r.request_id = rd.request_id
    WHERE r.user_id = $1
      AND r.is_deleted = FALSE
      AND EXISTS (
        SELECT 1
        FROM request_details x
        WHERE x.request_id = r.request_id
          AND (x.processing_status IS DISTINCT FROM 'completed')
      )
    GROUP BY
      r.request_id, r.request_code, r.request_date, r.request_status, r.is_urgent
    ORDER BY r.updated_at DESC;
  `;

  const sanitize = (s) => s.replace(/\u00A0/g, " ").replace(/\r/g, "");
  const result = await pool.query(sanitize(query), [userId]);
  return result.rows;
};

// ─────────────────────────────────────────────
// 2. ดึงรายละเอียดคำขอ
exports.getRequestDetailByUser = async (requestId, userId) => {
  const query = `
    SELECT 
      r.request_id,
      r.request_code,
      r.request_date,
      r.request_status,
      r.request_note,
      r.is_urgent,
      u.firstname || ' ' || u.lastname AS user_name,  -- ✅ ใช้ชื่อจริง + นามสกุล
      d.department_name_th AS department,             -- ✅ แผนกจาก Admin.departments
      json_agg(
        json_build_object(
          'request_detail_id', rd.request_detail_id,
          'item_id', i.item_id,
          'item_name', i.item_name,
          'item_unit', i.item_unit,
          'item_img', i.item_img,
          'quantity', rd.requested_qty,
          'approved_qty', rd.approved_qty,
          'request_detail_type', rd.request_detail_type,
          'processing_status', rd.processing_status,
          'expected_return_date', rd.expected_return_date,
          'returns', (
            SELECT COALESCE(
              json_agg(
                json_build_object(
                  'return_id', br.return_id,
                  'return_date', br.return_date,
                  'return_qty', br.return_qty,
                  'return_status', br.return_status,
                  'condition', br.condition,
                  'return_note', br.return_note
                )
              ), '[]'::json
            )
            FROM borrow_returns br
            WHERE br.request_detail_id = rd.request_detail_id
          )
        )
      ) AS items
    FROM requests r
    JOIN "Admin".users u ON r.user_id = u.user_id
    LEFT JOIN "Admin".departments d ON r.department_id = d.department_id
    LEFT JOIN request_details rd ON r.request_id = rd.request_id
    LEFT JOIN items i ON rd.item_id = i.item_id
    WHERE r.request_id = $1 AND r.user_id = $2
    GROUP BY r.request_id, u.firstname, u.lastname, d.department_name_th;
  `;
  const { rows } = await pool.query(query, [requestId, userId]);
  return rows[0];
};


// ─────────────────────────────────────────────
// 3. ยกเลิกคำขอ
exports.cancelRequestById = async (requestId, userId) => {
  const query = `
    UPDATE requests
    SET request_status = 'ยกเลิกโดยผู้ใช้'
    WHERE request_id = $1 
      AND user_id = $2 
      AND request_status = 'รอดำเนินการ'
    RETURNING *;
  `;
  const result = await pool.query(query, [requestId, userId]);
  return result.rowCount > 0;
};

// ─────────────────────────────────────────────
// 4. ลบคำขอ
exports.deleteRequestById = async (requestId, userId) => {
  const result = await pool.query(
    `
    UPDATE requests
    SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
    WHERE request_id = $1 AND user_id = $2 AND request_status = 'waiting_approval'
    RETURNING *;
    `,
    [requestId, userId]
  );
  return result.rowCount > 0;
};
