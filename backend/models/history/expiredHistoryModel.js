const { pool } = require("../../config/db");

// ✅ ดึงประวัติของหมดอายุจาก expired_items
exports.getAllExpired = async () => {
  const result = await pool.query(
    `SELECT 
        ei.expired_id,
        ei.expired_date,
        ei.expired_qty,
        ei.disposed_qty,
        ei.note,
        i.item_name,
        i.item_unit,
        l.lot_no,
        l.exp_date,
        u.user_name
     FROM expired_items ei
     JOIN item_lots l ON ei.lot_id = l.lot_id
     JOIN items i ON l.item_id = i.item_id
     LEFT JOIN users u ON ei.reported_by = u.user_id
     ORDER BY ei.expired_date DESC`
  );
  return result.rows;
};
