const { pool } = require('../../config/db');

// ── แบบ Flat ──
exports.getAllDamaged = async () => {
  const query = `
    SELECT 
      di.damaged_id,
      di.damaged_date,
      di.damaged_qty,
      di.damage_type,
      di.damaged_status,
      di.damaged_note,
      di.source_type,
      i.item_name,
      i.item_unit,
      CONCAT(u.firstname, ' ', u.lastname) AS reported_by, -- ✅ ใช้ชื่อเต็ม
      da.action_type,
      da.action_qty,
      da.action_date,
      CONCAT(ua.firstname, ' ', ua.lastname) AS action_by   -- ✅ ใช้ชื่อเต็ม
    FROM damaged_items di
    LEFT JOIN items i ON di.item_id = i.item_id
    LEFT JOIN "Admin".users u ON di.reported_by = u.user_id
    LEFT JOIN damaged_actions da ON di.damaged_id = da.damaged_id
    LEFT JOIN "Admin".users ua ON da.action_by = ua.user_id
    WHERE di.source_type IN ('borrow_return', 'stock_check')
    ORDER BY di.damaged_date DESC, da.action_date DESC;
  `;
  const { rows } = await pool.query(query);
  return rows;
};

// ── แบบ Grouped ──
exports.getDamagedDetail = async (id) => {
  const query = `
    SELECT 
      di.damaged_id,
      di.damaged_date,
      di.damaged_qty,
      di.damage_type,
      di.damaged_status,
      di.damaged_note,
      di.source_type,
      i.item_name,
      i.item_unit,
      CONCAT(u.firstname, ' ', u.lastname) AS reported_by,
      json_agg(
        json_build_object(
          'action_type', da.action_type,
          'action_qty', da.action_qty,
          'action_date', da.action_date,
          'action_by', CONCAT(ua.firstname, ' ', ua.lastname)
        )
        ORDER BY da.action_date DESC
      ) AS actions
    FROM damaged_items di
    LEFT JOIN items i ON di.item_id = i.item_id
    LEFT JOIN "Admin".users u ON di.reported_by = u.user_id
    LEFT JOIN damaged_actions da ON di.damaged_id = da.damaged_id
    LEFT JOIN "Admin".users ua ON da.action_by = ua.user_id
    WHERE di.damaged_id = $1
      AND di.source_type IN ('borrow_return', 'stock_check')
    GROUP BY di.damaged_id, i.item_name, i.item_unit, u.firstname, u.lastname
    ORDER BY di.damaged_date DESC;
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
};
