const { pool } = require("../../config/db");

exports.getDamagedReport = async () => {
  const query = `
    SELECT 
      i.item_name,
      i.item_category AS category,
      l.lot_no,
      di.damaged_qty,
      di.damaged_date,
      di.damage_type,
      di.damaged_note,
      u.user_fname || ' ' || u.user_lname AS reported_by,
      -- ✅ รวมจำนวนที่จัดการแล้ว (ซ่อม + ทิ้ง)
      (COALESCE(di.repaired_qty,0) + COALESCE(di.disposed_qty,0)) AS managed_qty,
      -- ✅ จำนวนที่เหลือ
      GREATEST(di.damaged_qty - (COALESCE(di.repaired_qty,0) + COALESCE(di.disposed_qty,0)), 0) AS remaining_qty,
      CASE
        WHEN (COALESCE(di.repaired_qty,0) + COALESCE(di.disposed_qty,0)) = 0 THEN 'ยังไม่จัดการ'
        WHEN (COALESCE(di.repaired_qty,0) + COALESCE(di.disposed_qty,0)) < di.damaged_qty THEN 'จัดการบางส่วน'
        ELSE 'จัดการครบแล้ว'
      END AS manage_status
    FROM damaged_items di
    JOIN items i ON di.item_id = i.item_id
    JOIN item_lots l ON di.lot_id = l.lot_id
    LEFT JOIN users u ON di.reported_by = u.user_id
    ORDER BY di.damaged_date DESC;
  `;
  const { rows } = await pool.query(query);
  return rows;
};