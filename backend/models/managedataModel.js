// models/managedataModel.js
const { pool } = require('../config/db');

// ✅ ฟังก์ชันช่วย: แปลง '' เป็น null หรือตัวเลข
const toNullOrValue = (v) => (v === '' ? null : v);
const toNullOrFloat = (v) => (v === '' ? null : parseFloat(v));
const toNullOrInt = (v) => (v === '' ? null : parseInt(v));

// ----------------------------------------------------------------------
// ดึงข้อมูลทั้งหมด (Manage Data)
// ----------------------------------------------------------------------
exports.getAllItemsDetailed = async () => {
  try {
    const query = `
      SELECT
          i.*,
          m.med_code,
          ms.medsup_code,
          e.equip_code,
          md.meddevice_code,
          g.gen_code,
          COALESCE(SUM(il.qty_remaining), 0) AS total_on_hand_qty
      FROM items i
      LEFT JOIN item_lots il ON i.item_id = il.item_id
      LEFT JOIN medicine_detail m ON i.item_id = m.item_id
      LEFT JOIN medsup_detail ms ON i.item_id = ms.item_id
      LEFT JOIN equipment_detail e ON i.item_id = e.item_id
      LEFT JOIN meddevices_detail md ON i.item_id = md.item_id
      LEFT JOIN generalsup_detail g ON i.item_id = g.item_id
      WHERE i.is_deleted = false
      GROUP BY
          i.item_id, m.med_code, ms.medsup_code, e.equip_code, md.meddevice_code, g.gen_code
      ORDER BY total_on_hand_qty ASC, i.created_at DESC;
    `;
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('❌ ดึงข้อมูล Inventory ล้มเหลว:', error);
    throw error;
  }
};

// ----------------------------------------------------------------------
// ดึงข้อมูลรายการเดียว
// ----------------------------------------------------------------------
exports.getItemById = async (id) => {
  try {
    const query = `SELECT
      i.item_id,
      i.item_name,
      i.item_category,
      i.item_sub_category,
      i.item_location,
      i.item_zone,
      i.item_unit,
      i.item_min,
      i.item_max,
      i.item_status,
      i.item_barcode,
      i.created_at,
      i.updated_at,
      i.item_img,
      i.is_deleted,
      i.item_purchase_unit,
      i.item_conversion_rate,
      i.is_borrowable,
      CASE
        WHEN i.item_img IS NOT NULL THEN 'http://localhost:5000/uploads/' || i.item_img
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
      m.med_medium_price,
      m.med_tmt_code,
      m.med_tpu_code,
      m.med_tmt_gp_name,
      m.med_tmt_tp_name,
      m.med_severity,
      m.med_essential_med_list,
      m.med_pregnancy_category,
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
      e.equip_maintenance_cycle,
      e.equip_note,
      e.equip_code,
      md.meddevice_id,
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
    WHERE i.item_id = $1 AND i.is_deleted = false
    LIMIT 1;`;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  } catch (error) {
    console.error('❌ getItemById error:', error);
    throw error;
  }
};

// ----------------------------------------------------------------------
// อัปเดตข้อมูลในตารางหลัก (รองรับ Supabase URL)
// ----------------------------------------------------------------------
exports.updateBaseItem = async (id, data) => {
  try {
    const isBorrowable =
      data.is_borrowable === true || data.is_borrowable === 'true';

    const updatedBy = data.updated_by || null;

    const query = `
      UPDATE items SET
        item_category = $1,
        item_name = $2,
        item_sub_category = $3,
        item_location = $4,
        item_zone = $5,
        item_unit = $6,
        item_min = $7,
        item_max = $8,
        item_barcode = $9,
        item_img = COALESCE($10, item_img),
        original_name = COALESCE($11, original_name),
        item_purchase_unit = $12,
        item_conversion_rate = $13,
        is_borrowable = $14,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = $15
      WHERE item_id = $16
      RETURNING *;
    `;

    const values = [
      toNullOrValue(data.item_category),
      toNullOrValue(data.item_name),
      toNullOrValue(data.item_sub_category),
      toNullOrValue(data.item_location),
      toNullOrValue(data.item_zone),
      toNullOrValue(data.item_unit),
      toNullOrInt(data.item_min),
      toNullOrInt(data.item_max),
      toNullOrValue(data.item_barcode),
      toNullOrValue(data.item_img),        // ✅ URL จาก Supabase
      toNullOrValue(data.original_name),   // ✅ เก็บชื่อไฟล์จริง
      toNullOrValue(data.item_purchase_unit),
      toNullOrFloat(data.item_conversion_rate),
      isBorrowable,
      updatedBy,
      Number(id),
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('❌ updateBaseItem error:', error);
    throw error;
  }
};


// ----------------------------------------------------------------------
// อัปเดต Medicine
// ----------------------------------------------------------------------
exports.updateMedicine = async (item_id, data) => {
  const query = `
    UPDATE medicine_detail SET
      med_generic_name = $1,
      med_thai_name = $2,
      med_marketing_name = $3,
      med_counting_unit = $4,
      med_dosage_form = $5,
      med_medical_category = $6,
      med_medium_price = $7,
      med_tmt_code = $8,
      med_tpu_code = $9,
      med_tmt_gp_name = $10,
      med_tmt_tp_name = $11,
      med_severity = $12,
      med_essential_med_list = $13,
      med_pregnancy_category = $14,
      med_dose_dialogue = $15,
      med_replacement = $16
    WHERE item_id = $17;
  `;
  const values = [
    toNullOrValue(data.med_generic_name),
    toNullOrValue(data.med_thai_name),
    toNullOrValue(data.med_marketing_name),
    toNullOrValue(data.med_counting_unit),
    toNullOrValue(data.med_dosage_form),
    toNullOrValue(data.med_medical_category),
    toNullOrFloat(data.med_medium_price),
    toNullOrValue(data.med_tmt_code),
    toNullOrValue(data.med_tpu_code),
    toNullOrValue(data.med_tmt_gp_name),
    toNullOrValue(data.med_tmt_tp_name),
    toNullOrValue(data.med_severity),
    toNullOrValue(data.med_essential_med_list),
    toNullOrValue(data.med_pregnancy_category),
    toNullOrValue(data.med_dose_dialogue),
    toNullOrValue(data.med_replacement),
    Number(item_id),
  ];
  console.log('✅ updateMedicine', values);
  await pool.query(query, values);
};

// ----------------------------------------------------------------------
// อัปเดต Medsup
// ----------------------------------------------------------------------
exports.updateMedsup = async (item_id, data) => {
  const query = `
    UPDATE medsup_detail SET
      medsup_category = $1,
      medsup_brand = $2,
      medsup_serial_no = $3,
      medsup_status = $4,
      medsup_price = $5
    WHERE item_id = $6;
  `;
  const values = [
    toNullOrValue(data.medsup_category),
    toNullOrValue(data.medsup_brand),
    toNullOrValue(data.medsup_serial_no),
    toNullOrValue(data.medsup_status),
    toNullOrFloat(data.medsup_price),
    Number(item_id),
  ];
  console.log('✅ updateMedsup', values);
  await pool.query(query, values);
};

// ----------------------------------------------------------------------
// อัปเดต Equipment
// ----------------------------------------------------------------------
exports.updateEquipment = async (item_id, data) => {
  const query = `
    UPDATE equipment_detail SET
      equip_brand = $1,
      equip_model = $2,
      equip_maintenance_cycle = $3,
      equip_note = $4
    WHERE item_id = $5;
  `;
  const values = [
    toNullOrValue(data.equip_brand),
    toNullOrValue(data.equip_model),
    toNullOrValue(data.equip_maintenance_cycle),
    toNullOrValue(data.equip_note),
    Number(item_id),
  ];
  console.log('✅ updateEquipment', values);
  await pool.query(query, values);
};

// ----------------------------------------------------------------------
// อัปเดต MedDevice
// ----------------------------------------------------------------------
exports.updateMedDevice = async (item_id, data) => {
  const query = `
    UPDATE meddevices_detail SET
      meddevice_type = $1,
      meddevice_brand = $2,
      meddevice_model = $3,
      meddevice_serial_no = $4,
      meddevice_status = $5,
      meddevice_price = $6,
      meddevice_note = $7
    WHERE item_id = $8;
  `;
  const values = [
    toNullOrValue(data.meddevice_type),
    toNullOrValue(data.meddevice_brand),
    toNullOrValue(data.meddevice_model),
    toNullOrValue(data.meddevice_serial_no),
    toNullOrValue(data.meddevice_status),
    toNullOrFloat(data.meddevice_price),
    toNullOrValue(data.meddevice_note),
    Number(item_id),
  ];
  console.log('✅ updateMedDevice', values);
  await pool.query(query, values);
};

// ----------------------------------------------------------------------
// อัปเดต General
// ----------------------------------------------------------------------
exports.updateGeneral = async (item_id, data) => {
  const query = `
    UPDATE generalsup_detail SET
      gen_brand = $1,
      gen_model = $2,
      gen_spec = $3,
      gen_price = $4
    WHERE item_id = $5;
  `;
  const values = [
    toNullOrValue(data.gen_brand),
    toNullOrValue(data.gen_model),
    toNullOrValue(data.gen_spec),
    toNullOrFloat(data.gen_price),
    Number(item_id),
  ];
  console.log('✅ updateGeneral', values);
  await pool.query(query, values);
};