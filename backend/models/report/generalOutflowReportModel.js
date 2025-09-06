const { pool } = require("../../config/db");

exports.getGeneralOutflowReport = async (filters) => {
  const { type, start, end, user_id } = filters;

  let params = [];
  let paramIndex = 1;
  let conditions = [];

  if (type && type !== "all") {
    params.push(type);
    conditions.push(`stockout_type = $${paramIndex++}`);
  }

  if (start && end) {
    const startOfDay = start + " 00:00:00";
    const endOfDay = end + " 23:59:59";
    params.push(startOfDay, endOfDay);
    conditions.push(`doc_date BETWEEN $${paramIndex++} AND $${paramIndex++}`);
  }

  if (user_id && user_id !== "all") {
    params.push(user_id);
    conditions.push(`user_id = $${paramIndex++}`);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const query = `
    SELECT * FROM (
      SELECT 
        so.stockout_no AS doc_no,
        so.stockout_date AS doc_date,
        so.stockout_type AS outflow_type, -- ✅ ใช้ enum อังกฤษตรงๆ
        sod.qty,
        COALESCE(sod.unit, i.item_unit, '-') AS unit,
        i.item_name,
        COALESCE(i.item_category, '-') AS category,
        COALESCE(il.lot_no, '-') AS lot_no,
        COALESCE(u.firstname || ' ' || u.lastname, '-') AS user_name,
        COALESCE(so.note, '-') AS doc_note,
        so.user_id
      FROM stock_outs so
      JOIN stock_out_details sod ON so.stockout_id = sod.stockout_id
      JOIN items i ON i.item_id = sod.item_id
      LEFT JOIN item_lots il ON il.lot_id = sod.lot_id
      LEFT JOIN "Admin".users u ON u.user_id = so.user_id
    ) AS combined_outflow
    ${whereClause}
    ORDER BY doc_date DESC
  `;

  try {
    const { rows } = await pool.query(query, params);
    return rows;
  } catch (err) {
    console.error("Error fetching general outflow report:", err);
    throw err;
  }
};
