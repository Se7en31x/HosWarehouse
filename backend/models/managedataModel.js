const { pool } = require('../config/db');

// ✅ ฟังก์ชันช่วย: แปลง '' เป็น null สำหรับ date fields
function parseDateOrNull(value) {
  return value === '' ? null : value;
}

exports.allItems = async () => {
  try {
    const query = `
      SELECT 
        i.item_id,
        i.item_name,
        i.item_category,
        i.item_qty,
        i.item_unit,
        i.item_location,
        i.item_img,
        i.item_update,
        i.item_status,

        m.med_code,
        ms.medsup_code,
        e.equip_code,
        md.meddevice_code,
        g.gen_code

      FROM items i
      LEFT JOIN medicine_detail m ON i.item_id = m.item_id
      LEFT JOIN medsup_detail ms ON i.item_id = ms.item_id
      LEFT JOIN equipment_detail e ON i.item_id = e.item_id
      LEFT JOIN meddevices_detail md ON i.item_id = md.item_id
      LEFT JOIN generalsup_detail g ON i.item_id = g.item_id
      WHERE i.is_deleted = false
      ORDER BY i.item_update DESC;
    `;
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('❌ ดึงข้อมูล manageData ล้มเหลว:', error);
    throw error;
  }
};

// ดึงข้อมูลรายการเดียว
exports.getItemById = async (id) => {
  const query = `
    SELECT 
      -- ข้อมูลหลักจากตาราง items
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
      i.is_deleted,
      -- สร้าง URL รูปภาพเฉพาะกรณีมีรูปจริง
      CASE 
        WHEN i.item_img IS NOT NULL THEN CONCAT('http://localhost:5000/uploads/', i.item_img)
        ELSE NULL
      END AS item_img_url,

      -- ข้อมูลจาก medicine_detail
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

      -- ข้อมูลจาก medsup_detail
      ms.medsup_id,
      ms.medsup_category,
      ms.medsup_brand,
      ms.medsup_serial_no,
      ms.medsup_status,
      ms.medsup_code,
      ms.medsup_price,

      -- ข้อมูลจาก equipment_detail
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

      -- ข้อมูลจาก meddevices_detail
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

      -- ข้อมูลจาก generalsup_detail
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
    WHERE i.item_id = $1 AND i.is_deleted = false
    LIMIT 1;
  `;

  const result = await pool.query(query, [id]);
  return result.rows[0];
};


// อัปเดตข้อมูลในตารางหลัก
exports.updateBaseItem = async (id, data, file) => {
  if (data.item_exp === '') data.item_exp = null;
  const values = [
    data.item_category,
    data.item_name,
    data.item_sub_category,
    data.item_location,
    data.item_zone,
    data.item_exp,
    data.item_qty,
    data.item_unit,
    data.item_min,
    data.item_max,
    id,
  ];

  let query;

  if (file) {
    // กรณีมีการอัปโหลดรูปใหม่
    values.splice(10, 0, file.filename); // เพิ่มเข้า index ที่ 10
    query = `
      UPDATE items SET
        item_category = $1,
        item_name = $2,
        item_sub_category = $3,
        item_location = $4,
        item_zone = $5,
        item_exp = $6,
        item_qty = $7,
        item_unit = $8,
        item_min = $9,
        item_max = $10,
        item_img = $11,
        item_update = CURRENT_TIMESTAMP
      WHERE item_id = $12
      RETURNING *;
    `;
  } else {
    // กรณีไม่มีการอัปโหลดรูปใหม่
    query = `
      UPDATE items SET
        item_category = $1,
        item_name = $2,
        item_sub_category = $3,
        item_location = $4,
        item_zone = $5,
        item_exp = $6,
        item_qty = $7,
        item_unit = $8,
        item_min = $9,
        item_max = $10,
        item_update = CURRENT_TIMESTAMP
      WHERE item_id = $11
      RETURNING *;
    `;
  }

  const result = await pool.query(query, values);
  return result.rows[0];
};



// อัปเดต Medicine
exports.updateMedicine = async (item_id, data) => {
  const query = `
    UPDATE medicine_detail SET
      med_generic_name = $1,
      med_thai_name = $2,
      med_marketing_name = $3,
      med_counting_unit = $4,
      med_dosage_form = $5,
      med_medical_category = $6,
      med_cost_price = $7,
      med_selling_price = $8,
      med_medium_price = $9,
      med_tmt_code = $10,
      med_tpu_code = $11,
      med_tmt_GP_name = $12,
      med_tmt_TP_name = $13,
      med_severity = $14,
      med_essential_med_list = $15,
      med_pregnancy_cagetory = $16,
      med_mfg = $17,
      med_exp = $18,
      med_dose_dialogue = $19,
      med_replacement = $20
    WHERE item_id = $21
  `;
  const values = [
    data.med_generic_name,
    data.med_thai_name,
    data.med_marketing_name,
    data.med_counting_unit,
    data.med_dosage_form,
    data.med_medical_category,
    data.med_cost_price === '' ? null : parseFloat(data.med_cost_price),
    data.med_selling_price === '' ? null : parseFloat(data.med_selling_price),
    data.med_medium_price === '' ? null : parseFloat(data.med_medium_price),
    data.med_tmt_code,
    data.med_tpu_code,
    data.med_tmt_gp_name,
    data.med_tmt_tp_name,
    data.med_severity,
    data.med_essential_med_list,
    data.med_pregnancy_cagetory,
    data.med_mfg,
    parseDateOrNull(data.med_exp), // ✅
    data.med_dose_dialogue,
    data.med_replacement,
    item_id,
  ];
  await pool.query(query, values);
};

// อัปเดต Medsup
exports.updateMedsup = async (item_id, data) => {
  const query = `
    UPDATE medsup_detail SET
      medsup_category = $1,
      medsup_brand = $2,
      medsup_serial_no = $3,
      medsup_status = $4,
      medsup_price = $5
    WHERE item_id = $6
  `;
  const values = [
    data.medsup_category,
    data.medsup_brand,
    data.medsup_serial_no,
    data.medsup_status,
    data.medsup_price,
    item_id,
  ];
  await pool.query(query, values);
};

// อัปเดต Equipment
exports.updateEquipment = async (item_id, data) => {
  const query = `
    UPDATE equipment_detail SET
      equip_brand = $1,
      equip_model = $2,
      equip_serial_no = $3,
      equip_status = $4,
      equip_location = $5,
      equip_price = $6,
      equip_purchase_date = $7,
      equip_warranty_expire = $8,
      equip_maintenance_cycle = $9,
      equip_last_maintenance = $10,
      equip_qr_code = $11,
      equip_note = $12
    WHERE item_id = $13
  `;
  const values = [
    data.equip_brand,
    data.equip_model,
    data.equip_serial_no,
    data.equip_status,
    data.equip_location,
    data.equip_price,
    parseDateOrNull(data.equip_purchase_date),      // ✅
    parseDateOrNull(data.equip_warranty_expire),    // ✅
    data.equip_maintenance_cycle,
    parseDateOrNull(data.equip_last_maintenance),   // ✅
    data.equip_qr_code,
    data.equip_note,
    item_id,
  ];
  await pool.query(query, values);
};

// อัปเดต Med Device
exports.updateMedDevice = async (item_id, data) => {
  const query = `
    UPDATE meddevices_detail SET
      meddevice_name = $1,
      meddevice_type = $2,
      meddevice_brand = $3,
      meddevice_model = $4,
      meddevice_serial_no = $5,
      meddevice_status = $6,
      meddevice_price = $7,
      meddevice_note = $8
    WHERE item_id = $9
  `;
  const values = [
    data.meddevice_name,
    data.meddevice_type,
    data.meddevice_brand,
    data.meddevice_model,
    data.meddevice_serial_no,
    data.meddevice_status,
    data.meddevice_price,
    data.meddevice_note,
    item_id,
  ];
  await pool.query(query, values);
};

// อัปเดต General
exports.updateGeneral = async (item_id, data) => {
  const query = `
    UPDATE generalsup_detail SET
      gen_brand = $1,
      gen_model = $2,
      gen_spec = $3,
      gen_price = $4
    WHERE item_id = $5
  `;
  const values = [
    data.gen_brand,
    data.gen_model,
    data.gen_spec,
    data.gen_price,
    item_id,
  ];
  await pool.query(query, values);
};
