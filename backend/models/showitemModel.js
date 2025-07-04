exports.getAllVisibleItems = async () => {
  const query = `
    SELECT 
      i.item_id,
      i.item_name,
      i.item_category,
      i.item_qty,
      i.item_unit,
      i.item_location,
      i.item_status,
      i.item_update,
      CASE 
        WHEN i.item_img IS NOT NULL 
        THEN CONCAT('http://localhost:5000/uploads/', i.item_img)
        ELSE NULL
      END AS item_img_url,
      CASE 
        WHEN i.item_category = 'medicine' THEN m.med_code
        WHEN i.item_category = 'medsup' THEN ms.medsup_code
        WHEN i.item_category = 'equipment' THEN e.equip_code
        WHEN i.item_category = 'meddevice' THEN md.meddevice_code
        WHEN i.item_category = 'general' THEN g.gen_code
        ELSE NULL
      END AS item_code
    FROM items i
    LEFT JOIN medicine_detail m ON i.item_id = m.item_id
    LEFT JOIN medsup_detail ms ON i.item_id = ms.item_id
    LEFT JOIN equipment_detail e ON i.item_id = e.item_id
    LEFT JOIN meddevices_detail md ON i.item_id = md.item_id
    LEFT JOIN generalsup_detail g ON i.item_id = g.item_id
    WHERE i.is_deleted = false
    ORDER BY i.item_id
    LIMIT 100;
  `;
  const result = await pool.query(query);
  return result.rows;
};
