const { pool } = require("../../config/db");

exports.getAll = async () => {
  const query = `
    SELECT 
        r.request_id,
        r.request_code,
        r.request_date,
        r.request_status,
        r.is_urgent,

        -- ✅ ผู้ร้องขอ
        u.firstname || ' ' || u.lastname AS requester_name,
        d.department_name_th AS department_name,

        -- ✅ ข้อมูลผู้อนุมัติ
        COALESCE(approver.firstname || ' ' || approver.lastname, '-') AS approved_by_name,
        r.approved_at,

        COUNT(rd.request_detail_id) AS total_items,
        SUM(rd.approved_qty) AS total_qty,

        json_agg(
            json_build_object(
                'item_id', i.item_id,
                'item_name', i.item_name,
                'requested_qty', rd.requested_qty,
                'approved_qty', rd.approved_qty,
                'unit', i.item_unit,
                'status', rd.approval_status,
                'processing_status', rd.processing_status
            ) ORDER BY i.item_name
        ) AS details

    FROM requests r
    JOIN "Admin".users u ON r.user_id = u.user_id
    LEFT JOIN "Admin".departments d ON r.department_id = d.department_id   -- ✅ ใช้ department_id จาก requests
    JOIN request_details rd ON r.request_id = rd.request_id
    JOIN items i ON rd.item_id = i.item_id
    LEFT JOIN "Admin".users approver ON r.approved_by = approver.user_id

    WHERE r.request_status NOT IN ('draft','canceled')
    GROUP BY 
        r.request_id, r.request_code, r.request_date, r.request_status, 
        r.is_urgent,
        u.firstname, u.lastname, d.department_name_th,
        approver.firstname, approver.lastname, 
        r.approved_at
    ORDER BY r.request_date DESC;
  `;

  const { rows } = await pool.query(query);
  return rows;
};
