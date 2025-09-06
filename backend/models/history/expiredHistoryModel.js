const { pool } = require("../../config/db");

// ✅ ดึงประวัติของหมดอายุ พร้อมจำนวนทำลายจริง และผู้ทำลายล่าสุด
exports.getAllExpired = async () => {
  const result = await pool.query(`
    SELECT 
      ei.expired_id,
      ei.expired_date,
      ei.expired_qty,
      COALESCE(SUM(ea.action_qty), 0) AS disposed_qty,  -- รวมจำนวนทำลายจริง
      ei.note,
      i.item_name,
      i.item_unit,
      l.lot_no,
      l.exp_date,
      l.qty_imported,   -- ✅ จำนวนรับเข้ามา
      reporter.firstname || ' ' || reporter.lastname AS reported_by, -- ผู้รายงาน
      last_action.action_by_name AS last_disposed_by
    FROM expired_items ei
    JOIN item_lots l ON ei.lot_id = l.lot_id
    JOIN items i ON l.item_id = i.item_id
    LEFT JOIN "Admin".users reporter ON ei.reported_by = reporter.user_id
    LEFT JOIN expired_actions ea ON ei.lot_id = ea.lot_id
    LEFT JOIN LATERAL (   -- ✅ subquery หาผู้ทำลายล่าสุด
      SELECT 
        a.action_by,
        usr.firstname || ' ' || usr.lastname AS action_by_name
      FROM expired_actions a
      LEFT JOIN "Admin".users usr ON a.action_by = usr.user_id
      WHERE a.lot_id = ei.lot_id
      ORDER BY a.action_date DESC
      LIMIT 1
    ) AS last_action ON true
    GROUP BY ei.expired_id, ei.expired_date, ei.expired_qty, ei.note,
             i.item_name, i.item_unit, l.lot_no, l.exp_date, l.qty_imported,
             reporter.firstname, reporter.lastname, last_action.action_by_name
    ORDER BY ei.expired_date DESC;
  `);
  return result.rows;
};
