const { pool } = require("../../config/db");

exports.getOutflowReport = async (filters) => {
  const { type, department, start, end } = filters;

  // ==== DEBUGGING: แสดงค่าที่ได้รับจากหน้าบ้าน ====
  console.log("--- DEBUG: Outflow Report Filters ---");
  console.log("Type:", type);
  console.log("Department:", department);
  console.log("Start Date:", start);
  console.log("End Date:", end);
  console.log("-------------------------------------");

  const params = [];
  let paramIndex = 1;
  let baseWhere = "WHERE 1=1";

  // กรองประเภทคำขอ
  if (type && type !== "all") {
    params.push(type);
    baseWhere += ` AND r.request_type = $${paramIndex}`;
    paramIndex++;
  }

  // กรองแผนก
  if (department && department !== "all") {
    params.push(department);
    baseWhere += ` AND u.department = $${paramIndex}`;
    paramIndex++;
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
      u.department,
      rd.approval_status,
      rd.processing_status
    FROM requests r
    JOIN request_details rd ON r.request_id = rd.request_id
    JOIN items i ON rd.item_id = i.item_id
    JOIN users u ON r.user_id = u.user_id
    LEFT JOIN borrow_detail_lots bdl ON rd.request_detail_id = bdl.request_detail_id
    ${baseWhere}
    GROUP BY
      r.request_code, r.request_date, i.item_name, i.item_category,
      rd.approved_qty, rd.actual_deducted_qty, i.item_unit, r.request_type,
      u.department, rd.approval_status, rd.processing_status
    ORDER BY r.request_date DESC;
  `;

  // ==== DEBUGGING: แสดงคำสั่ง SQL และ Parameters ที่ใช้ ====
  console.log("Generated SQL Query:", query);
  console.log("SQL Parameters:", params);
  console.log("-----------------------------------------");

  try {
    const { rows } = await pool.query(query, params);
    return rows;
  } catch (error) {
    console.error("Error fetching outflow report (Model):", error);
    throw new Error("Failed to retrieve outflow report.");
  }
};