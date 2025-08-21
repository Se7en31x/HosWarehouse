// models/statusModel.js
const { pool } = require('../config/db');

exports.getRequestsByStatus = async ({ userId, status }) => {
  let query = `
    SELECT 
      r.request_id,
      r.request_code,
      r.request_type,
      r.request_status,
      r.is_urgent,
      r.request_date,
      r.updated_at,

      -- รวมรายการ item (ไม่เอา lot)
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'detail_id', rd.request_detail_id,
            'item_id', i.item_id,
            'item_name', i.item_name,
            'item_unit', i.item_unit,
            'image', 
              CASE 
                WHEN i.item_img IS NOT NULL AND i.item_img <> '' 
                THEN CONCAT('http://localhost:5000/uploads/', i.item_img)
                ELSE 'http://localhost:5000/public/defaults/placeholder.png'
              END,
            'requested_qty', rd.requested_qty,
            'approved_qty', rd.approved_qty
          )
        ) FILTER (WHERE rd.request_detail_id IS NOT NULL), '[]'
      ) as items,

      -- รวมสถานะการคืน
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'return_id', br.return_id,
            'request_detail_id', br.request_detail_id,
            'return_date', br.return_date,
            'return_qty', br.return_qty,
            'return_status', br.return_status,
            'return_note', br.return_note,
            'condition', br.condition
          )
        ) FILTER (WHERE br.return_id IS NOT NULL), '[]'
      ) as returns

    FROM requests r
    LEFT JOIN request_details rd ON r.request_id = rd.request_id
    LEFT JOIN items i ON rd.item_id = i.item_id
    LEFT JOIN borrow_returns br ON rd.request_detail_id = br.request_detail_id
    WHERE r.user_id = $1
  `;

  const params = [userId];
  let idx = 2;

  if (status && status !== 'all') {
    query += ` AND r.request_status = $${idx++}`;
    params.push(status);
  }

  query += `
    GROUP BY r.request_id
    ORDER BY r.updated_at DESC
  `;

  const { rows } = await pool.query(query, params);
  return rows;
};
