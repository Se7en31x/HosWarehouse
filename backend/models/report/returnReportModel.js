// backend/models/report/returnReportModel.js
const { pool } = require("../../config/db");

exports.getReturnReport = async (filters) => {
  const { department, dateRange } = filters;

  const params = [];
  let whereClause = "WHERE r.request_type = 'borrow'"; // ✅ เอาเฉพาะคำขอแบบยืม

  if (department && department !== "all") {
    params.push(department);
    whereClause += ` AND u.department = $${params.length}`;
  }

  if (dateRange?.start && dateRange?.end) {
    params.push(dateRange.start, dateRange.end);
    whereClause += ` AND r.request_date BETWEEN $${params.length - 1} AND $${params.length}`;
  }

  const query = `
    SELECT 
      r.request_code,
      i.item_name,
      rd.approved_qty,
      rd.approval_status,  -- ✅ เพิ่มสถานะอนุมัติ
      COALESCE(SUM(br.return_qty), 0) AS returned_qty,
      (rd.approved_qty - COALESCE(SUM(br.return_qty), 0)) AS not_returned_qty,
      MAX(br.return_date) AS last_return_date,
      CASE
        WHEN COALESCE(SUM(br.return_qty), 0) = 0 THEN 'ยังไม่คืน'
        WHEN COALESCE(SUM(br.return_qty), 0) < rd.approved_qty THEN 'คืนบางส่วน'
        ELSE 'คืนครบแล้ว'
      END AS return_status,
      u.department
    FROM request_details rd
    JOIN requests r ON rd.request_id = r.request_id
    JOIN items i ON rd.item_id = i.item_id
    JOIN users u ON r.user_id = u.user_id
    LEFT JOIN borrow_returns br ON rd.request_detail_id = br.request_detail_id
    ${whereClause}
    GROUP BY r.request_code, i.item_name, rd.approved_qty, rd.approval_status, u.department
    ORDER BY r.request_code DESC;
  `;

  const { rows } = await pool.query(query, params);
  return rows;
};
