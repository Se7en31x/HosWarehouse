const { pool } = require("../../config/db");

exports.getInflowReport = async (filters) => {
  const { type, start, end, user_id } = filters;

  let params = [];
  let paramIndex = 1;
  let conditions = [];

  if (type && type !== "all") {
    params.push(type);
    conditions.push(`si.stockin_type = $${paramIndex++}`);
  }

  if (start && end) {
    const startOfDay = start + ' 00:00:00';
    const endOfDay = end + ' 23:59:59';
    params.push(startOfDay, endOfDay);
    conditions.push(`si.stockin_date BETWEEN $${paramIndex++} AND $${paramIndex++}`);
  }

  if (user_id && user_id !== "all") {
    params.push(user_id);
    conditions.push(`si.user_id = $${paramIndex++}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const query = `
    SELECT
      si.stockin_no AS doc_no,
      si.stockin_date AS doc_date,
      si.stockin_type AS inflow_type,
      sid.qty,
      i.item_unit AS unit, 
      i.item_name,
      i.item_category AS category,
      il.lot_no,
      s.supplier_name AS supplier_name,   -- ✅ แก้ตรงนี้
      u.firstname || ' ' || u.lastname AS user_name
    FROM stock_in_details sid
    JOIN stock_ins si ON si.stockin_id = sid.stockin_id
    JOIN items i ON i.item_id = sid.item_id
    LEFT JOIN item_lots il ON sid.lot_id = il.lot_id
    LEFT JOIN purchase_orders po ON po.po_id = si.po_id
    LEFT JOIN suppliers s ON s.supplier_id = po.supplier_id
    LEFT JOIN "Admin".users u ON u.user_id = si.user_id
    ${whereClause}
    ORDER BY si.stockin_date DESC;
  `;

  try {
    const { rows } = await pool.query(query, params);
    return rows;
  } catch (err) {
    console.error("Error fetching inflow report:", err);
    throw err;
  }
};
