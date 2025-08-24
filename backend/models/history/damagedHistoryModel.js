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
      di.source_type,        -- ✅ อย่าลืม select field นี้มาด้วย
      i.item_name,
      i.item_unit,
      u.user_name AS reported_by,
      da.action_type,
      da.action_qty,
      da.action_date,
      ua.user_name AS action_by
    FROM damaged_items di
    LEFT JOIN items i ON di.item_id = i.item_id
    LEFT JOIN users u ON di.reported_by = u.user_id
    LEFT JOIN damaged_actions da ON di.damaged_id = da.damaged_id
    LEFT JOIN users ua ON da.action_by = ua.user_id
    WHERE di.source_type IN ('borrow_return', 'stock_check')   -- ✅ filter ตรงนี้
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
      di.source_type,   -- ✅ ติดมาด้วย
      i.item_name,
      i.item_unit,
      u.user_name AS reported_by,
      json_agg(
        json_build_object(
          'action_type', da.action_type,
          'action_qty', da.action_qty,
          'action_date', da.action_date,
          'action_by', ua.user_name
        )
        ORDER BY da.action_date DESC
      ) AS actions
    FROM damaged_items di
    LEFT JOIN items i ON di.item_id = i.item_id
    LEFT JOIN users u ON di.reported_by = u.user_id
    LEFT JOIN damaged_actions da ON di.damaged_id = da.damaged_id
    LEFT JOIN users ua ON da.action_by = ua.user_id
    WHERE di.damaged_id = $1
      AND di.source_type IN ('borrow_return', 'stock_check')   -- ✅ filter ตรงนี้ด้วย
    GROUP BY di.damaged_id, i.item_name, i.item_unit, u.user_name
    ORDER BY di.damaged_date DESC;
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
};
