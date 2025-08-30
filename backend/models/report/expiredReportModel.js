// backend/models/report/expiredReportModel.js
const { pool } = require("../../config/db");

exports.getExpiredReport = async () => {
  const query = `
    SELECT 
      i.item_name,
      i.item_category AS category,
      l.lot_no,
      l.exp_date,
      e.expired_qty,
      COALESCE(SUM(a.action_qty), 0) AS disposed_qty,
      (e.expired_qty - COALESCE(SUM(a.action_qty), 0)) AS remaining_qty,
      CASE
        WHEN COALESCE(SUM(a.action_qty), 0) = 0 THEN 'ยังไม่จัดการ'
        WHEN COALESCE(SUM(a.action_qty), 0) < e.expired_qty THEN 'จัดการบางส่วน'
        ELSE 'จัดการครบแล้ว'
      END AS manage_status
    FROM expired_items e
    JOIN item_lots l ON e.lot_id = l.lot_id
    JOIN items i ON l.item_id = i.item_id
    LEFT JOIN expired_actions a 
      ON l.lot_id = a.lot_id AND a.action_type = 'disposed'
    GROUP BY i.item_name, i.item_category, l.lot_no, l.exp_date, e.expired_qty
    ORDER BY l.exp_date ASC;
  `;

  const { rows } = await pool.query(query);
  return rows;
};
