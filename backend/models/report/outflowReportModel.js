const { pool } = require("../../config/db");

exports.getOutflowReport = async (filters) => {
  const { type, department, start, end } = filters;

  const params = [];
  let paramIndex = 1;
  let baseWhere = "WHERE 1=1";

  // กรองประเภทคำขอ
  if (type && type !== "all") {
    params.push(type);
    baseWhere += ` AND r.request_type = $${paramIndex++}`;
  }

  // กรองแผนก
  if (department && department !== "all") {
    params.push(department);
    baseWhere += ` AND d.department_id = $${paramIndex++}`;
  }

  // กรองช่วงเวลา
  if (start && end) {
    params.push(start, end);
    baseWhere += ` AND r.request_date::date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
    paramIndex += 2;
  }

  const query = `
    SELECT
      r.request_code,
      r.request_date,
      i.item_name,
      i.item_category AS category,
      rd.approved_qty,
      CASE
        WHEN r.request_type = 'withdraw' THEN rd.actual_deducted_qty
        WHEN r.request_type = 'borrow' THEN COALESCE(SUM(bdl.qty), 0)
        ELSE NULL
      END AS issued_qty,
      i.item_unit AS unit,
      r.request_type,
      d.department_name_th AS department, -- ✅ ใช้ชื่อแผนกจาก Admin.departments
      rd.approval_status,
      rd.processing_status
    FROM requests r
    JOIN request_details rd ON r.request_id = rd.request_id
    JOIN items i ON rd.item_id = i.item_id
    JOIN "Admin".users u ON r.user_id = u.user_id
    LEFT JOIN "Admin".user_departments ud ON u.user_id = ud.user_id
    LEFT JOIN "Admin".departments d ON ud.department_id = d.department_id
    LEFT JOIN borrow_detail_lots bdl ON rd.request_detail_id = bdl.request_detail_id
    ${baseWhere}
    GROUP BY
      r.request_code, r.request_date, i.item_name, i.item_category,
      rd.approved_qty, rd.actual_deducted_qty, i.item_unit, r.request_type,
      d.department_name_th, rd.approval_status, rd.processing_status
    ORDER BY r.request_date DESC;
  `;

  try {
    const { rows } = await pool.query(query, params);
    return rows;
  } catch (error) {
    console.error("Error fetching outflow report (Model):", error);
    throw new Error("Failed to retrieve outflow report.");
  }
};
