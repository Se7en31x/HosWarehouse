// backend/models/report/outflowReportModel.js
const { pool } = require("../../config/db");

exports.getOutflowReport = async (filters) => {
  const { type, department, dateRange } = filters;

  const params = [];
  let whereClause = "WHERE 1=1";

  // กรองประเภทคำขอ
  if (type && type !== "all") {
    params.push(type);
    whereClause += ` AND r.request_type = $${params.length}`;
  }

  // กรองแผนก
  if (department && department !== "all") {
    params.push(department);
    whereClause += ` AND u.department = $${params.length}`;
  }

  // กรองช่วงเวลา
  if (dateRange?.start && dateRange?.end) {
    params.push(dateRange.start, dateRange.end);
    whereClause += ` AND r.request_date BETWEEN $${params.length - 1} AND $${params.length}`;
  }

  const query = `
    SELECT * FROM (
      -- ✅ เบิก (Withdraw)
      SELECT 
        r.request_code,
        r.request_date,
        i.item_name,
        i.item_category AS category,
        rd.approved_qty,
        rd.actual_deducted_qty AS issued_qty,
        i.item_unit AS unit,
        r.request_type,
        u.department,
        rd.approval_status,       -- ✅ สถานะอนุมัติ (ระดับ detail)
        rd.processing_status      -- ✅ สถานะการดำเนินการ
      FROM requests r
      JOIN request_details rd ON r.request_id = rd.request_id
      JOIN items i ON rd.item_id = i.item_id
      JOIN users u ON r.user_id = u.user_id
      ${whereClause} AND r.request_type = 'withdraw'

      UNION ALL

      -- ✅ ยืม (Borrow)
      SELECT 
        r.request_code,
        r.request_date,
        i.item_name,
        i.item_category AS category,
        rd.approved_qty,
        COALESCE(SUM(bdl.qty), 0) AS issued_qty,
        i.item_unit AS unit,
        r.request_type,
        u.department,
        rd.approval_status,
        rd.processing_status
      FROM requests r
      JOIN request_details rd ON r.request_id = rd.request_id
      JOIN items i ON rd.item_id = i.item_id
      LEFT JOIN borrow_detail_lots bdl ON rd.request_detail_id = bdl.request_detail_id
      JOIN users u ON r.user_id = u.user_id
      ${whereClause} AND r.request_type = 'borrow'
      GROUP BY r.request_code, r.request_date, i.item_name, i.item_category,
               rd.approved_qty, i.item_unit, r.request_type, u.department, 
               rd.approval_status, rd.processing_status
    ) AS combined
    ORDER BY request_date DESC, request_code;
  `;

  const { rows } = await pool.query(query, params);
  return rows;
};
