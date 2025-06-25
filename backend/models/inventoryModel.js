const { pool } = require('../config/db');


exports.getAllItemsDetailed = async () => {
  const query = `
    SELECT 
      i.item_id,
      i.item_name,
      i.item_category,
      i.item_sub_category,
      i.item_location,
      i.item_zone,
      i.item_exp,
      i.item_qty,
      i.item_unit,
      i.item_min,
      i.item_max,
      i.item_status,
      i.item_created_at,
      i.item_update,
      i.item_img,
      CASE 
        WHEN i.item_img IS NOT NULL THEN CONCAT('http://localhost:5000/uploads/', i.item_img)
        ELSE NULL
      END AS item_img_url,
      m.med_id,
      m.med_code,
      m.med_generic_name,
      m.med_thai_name,
      m.med_marketing_name,
      m.med_counting_unit,
      m.med_dosage_form,
      m.med_medical_category,
      m.med_cost_price,
      m.med_selling_price,
      m.med_medium_price,
      m.med_tmt_code,
      m.med_tpu_code,
      m.med_tmt_gp_name,
      m.med_tmt_tp_name,
      m.med_severity,
      m.med_essential_med_list,
      m.med_pregnancy_cagetory,
      m.med_mfg,
      m.med_exp,
      m.med_dose_dialogue,
      m.med_replacement,
      ms.medsup_id,
      ms.medsup_category,
      ms.medsup_brand,
      ms.medsup_serial_no,
      ms.medsup_status,
      ms.medsup_code,
      ms.medsup_price,
      e.equip_id,
      e.equip_brand,
      e.equip_model,
      e.equip_serial_no,
      e.equip_status,
      e.equip_location,
      e.equip_price,
      e.equip_purchase_date,
      e.equip_warranty_expire,
      e.equip_maintenance_cycle,
      e.equip_last_maintenance,
      e.equip_qr_code,
      e.equip_note,
      e.equip_code,
      md.meddevice_id,
      md.meddevice_name,
      md.meddevice_type,
      md.meddevice_brand,
      md.meddevice_model,
      md.meddevice_serial_no,
      md.meddevice_status,
      md.meddevice_price,
      md.meddevice_note,
      md.meddevice_code,
      g.gen_id,
      g.gen_brand,
      g.gen_model,
      g.gen_spec,
      g.gen_price,
      g.gen_code
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

// models/inventoryModel.js

exports.getItemById = async (id) => {
  const query = `
    SELECT i.*, m.med_id, m.med_code, ms.medsup_id, e.equip_id, md.meddevice_id, g.gen_id
    FROM items i
    LEFT JOIN medicine_detail m ON i.item_id = m.item_id
    LEFT JOIN medsup_detail ms ON i.item_id = ms.item_id
    LEFT JOIN equipment_detail e ON i.item_id = e.item_id
    LEFT JOIN meddevices_detail md ON i.item_id = md.item_id
    LEFT JOIN generalsup_detail g ON i.item_id = g.item_id
    WHERE i.item_id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0]; // คืนข้อมูล object เดียว
};

