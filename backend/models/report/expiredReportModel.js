const { pool } = require("../../config/db");

exports.getExpiredReport = async (filters) => {
  const { category, status, start_date, end_date } = filters || {};
  const params = [];
  let whereConditions = [];
  let havingConditions = [];

  if (category && category !== "all") {
    params.push(category);
    whereConditions.push(`i.item_category = $${params.length}`);
  }

  if (status && status !== "all") {
    if (status === "managed") {
      havingConditions.push(`(e.expired_qty - COALESCE(SUM(a.action_qty), 0)) <= 0`);
    } else if (status === "unmanaged") {
      havingConditions.push(`COALESCE(SUM(a.action_qty), 0) = 0`);
    } else if (status === "partially_managed") {
      havingConditions.push(`COALESCE(SUM(a.action_qty), 0) > 0 AND (e.expired_qty - COALESCE(SUM(a.action_qty), 0)) > 0`);
    }
  }

  if (start_date && end_date) {
    params.push(start_date, end_date);
    whereConditions.push(`e.expired_date BETWEEN $${params.length - 1} AND $${params.length}`);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";
  const havingClause = havingConditions.length > 0 ? `HAVING ${havingConditions.join(" AND ")}` : "";

  const query = `
    SELECT 
      i.item_name,
      i.item_category AS category,
      l.lot_no,
      l.exp_date,
      l.qty_imported,
      e.expired_qty,
      COALESCE(SUM(a.action_qty), 0) AS disposed_qty,
      GREATEST(e.expired_qty - COALESCE(SUM(a.action_qty), 0), 0) AS remaining_qty,
      CASE
        WHEN COALESCE(SUM(a.action_qty), 0) = 0 THEN 'unmanaged'
        WHEN (e.expired_qty - COALESCE(SUM(a.action_qty), 0)) > 0 THEN 'partially_managed'
        ELSE 'managed'
      END AS manage_status
    FROM expired_items e
    JOIN item_lots l ON e.lot_id = l.lot_id
    JOIN items i ON l.item_id = i.item_id
    LEFT JOIN expired_actions a 
      ON l.lot_id = a.lot_id AND a.action_type = 'disposed'
    ${whereClause}
    GROUP BY e.expired_id, i.item_name, i.item_category, l.lot_no, l.exp_date, l.qty_imported, e.expired_qty
    ${havingClause}
    ORDER BY l.exp_date ASC;
  `;

  const { rows } = await pool.query(query, params);
  return rows;
};
