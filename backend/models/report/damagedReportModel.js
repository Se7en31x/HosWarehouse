const { pool } = require("../../config/db");

exports.getDamagedReport = async (filters) => {
  const { category, damage_type, status, start_date, end_date } = filters || {};
  const params = [];
  const whereConditions = [];

  if (category && category !== "all") {
    params.push(category);
    whereConditions.push(`i.item_category = $${params.length}`);
  }

  if (damage_type && damage_type !== "all") {
    params.push(damage_type);
    whereConditions.push(`di.damage_type = $${params.length}`);
  }

  if (status && status !== "all") {
    if (status === "managed") {
      whereConditions.push(`(COALESCE(di.repaired_qty, 0) + COALESCE(di.disposed_qty, 0)) = di.damaged_qty`);
    } else if (status === "unmanaged") {
      whereConditions.push(`(COALESCE(di.repaired_qty, 0) + COALESCE(di.disposed_qty, 0)) = 0`);
    } else if (status === "partially_managed") {
      whereConditions.push(`
        (COALESCE(di.repaired_qty, 0) + COALESCE(di.disposed_qty, 0)) > 0 
        AND (COALESCE(di.repaired_qty, 0) + COALESCE(di.disposed_qty, 0)) < di.damaged_qty
      `);
    }
  }

  if (start_date && end_date) {
    params.push(start_date, end_date);
    whereConditions.push(`di.damaged_date BETWEEN $${params.length - 1} AND $${params.length}`);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

  const query = `
    SELECT 
      i.item_name,
      i.item_category AS category,
      l.lot_no,
      di.damaged_qty,
      di.damaged_date,
      di.damage_type,
      COALESCE(u.firstname || ' ' || u.lastname, '-') AS reported_by,
      (COALESCE(di.repaired_qty,0) + COALESCE(di.disposed_qty,0)) AS managed_qty,
      GREATEST(di.damaged_qty - (COALESCE(di.repaired_qty,0) + COALESCE(di.disposed_qty,0)), 0) AS remaining_qty,
      CASE
        WHEN (COALESCE(di.repaired_qty,0) + COALESCE(di.disposed_qty,0)) = 0 THEN 'unmanaged'
        WHEN (COALESCE(di.repaired_qty,0) + COALESCE(di.disposed_qty,0)) < di.damaged_qty THEN 'partially_managed'
        ELSE 'managed'
      END AS manage_status,
      CASE i.item_category
          WHEN 'equipment' THEN ed.equip_code
          WHEN 'medsup' THEN msd.medsup_code
          WHEN 'meddevice' THEN mdd.meddevice_code
          WHEN 'medicine' THEN md.med_code
          WHEN 'general' THEN gsd.gen_code
          ELSE NULL
      END AS item_code
    FROM damaged_items di
    JOIN items i ON di.item_id = i.item_id
    LEFT JOIN item_lots l ON di.lot_id = l.lot_id
    LEFT JOIN "Admin".users u ON di.reported_by = u.user_id
    LEFT JOIN equipment_detail ed ON i.item_id = ed.item_id
    LEFT JOIN generalsup_detail gsd ON i.item_id = gsd.item_id
    LEFT JOIN meddevices_detail mdd ON i.item_id = mdd.item_id
    LEFT JOIN medsup_detail msd ON i.item_id = msd.item_id
    LEFT JOIN medicine_detail md ON i.item_id = md.item_id
    ${whereClause}
    ORDER BY di.damaged_date DESC;
  `;

  // if (process.env.NODE_ENV !== "production") {
  //   console.log("Final Damaged Report Query:", query);
  //   console.log("Query Parameters:", params);
  // }

  const { rows } = await pool.query(query, params);
  return rows;
};
