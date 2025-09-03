// models/addItemModel.js
const { pool } = require('../config/db');

// ===== Helpers =====
const toNullOrValue = (v) => (v === '' ? null : v);
const toNullOrFloat = (v) => (v === '' ? null : parseFloat(v));
const toNullOrInt = (v) => (v === '' ? null : parseInt(v));

async function generateAutoCode(client, { prefix, seqName }) {
  const { rows } = await client.query(`SELECT nextval('${seqName}') AS next_id`);
  const next = rows[0].next_id;
  return `${prefix}${String(next).padStart(6, '0')}`;
}

// ===== Base item =====
async function addBaseItem(client, data) {
  const sql = `
    INSERT INTO items (
      item_name, item_category, item_unit,
      item_location, item_min, item_max,
      item_img, item_zone, item_barcode, item_sub_category,
      item_status, is_deleted,
      item_purchase_unit, item_conversion_rate,
      is_borrowable
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    RETURNING item_id;
  `;
  const vals = [
    toNullOrValue(data.item_name),
    toNullOrValue(data.item_category),
    toNullOrValue(data.item_unit),
    toNullOrValue(data.item_location),
    toNullOrInt(data.item_min),
    toNullOrInt(data.item_max),
    toNullOrValue(data.item_img),
    toNullOrValue(data.item_zone),
    toNullOrValue(data.item_barcode),
    toNullOrValue(data.item_sub_category),
    'active',
    false,
    toNullOrValue(data.item_purchase_unit),
    toNullOrFloat(data.item_conversion_rate),
    data.is_borrowable
  ];
  const { rows } = await client.query(sql, vals);
  return rows[0].item_id;
}

// ===== Medicine =====
async function insertMedicine(client, item_id, d) {
  const code = await generateAutoCode(client, {
    prefix: 'MED_',
    seqName: 'medicine_seq'
  });

  await client.query(`
    INSERT INTO medicine_detail (
      item_id, med_code, med_generic_name, med_thai_name, med_marketing_name, med_counting_unit,
      med_dosage_form, med_medical_category, med_medium_price,
      med_tmt_code, med_tpu_code, med_tmt_gp_name, med_tmt_tp_name,
      med_severity, med_essential_med_list, med_pregnancy_category,
      med_dose_dialogue, med_replacement
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
    )
  `, [
    item_id,
    code,
    toNullOrValue(d.med_generic_name),
    toNullOrValue(d.med_thai_name),
    toNullOrValue(d.med_marketing_name),
    toNullOrValue(d.med_counting_unit),
    toNullOrValue(d.med_dosage_form),
    toNullOrValue(d.med_medical_category),
    toNullOrFloat(d.med_medium_price),
    toNullOrValue(d.med_tmt_code),
    toNullOrValue(d.med_tpu_code),
    toNullOrValue(d.med_tmt_gp_name),
    toNullOrValue(d.med_tmt_tp_name),
    toNullOrValue(d.med_severity),
    toNullOrValue(d.med_essential_med_list),
    toNullOrValue(d.med_pregnancy_category),
    toNullOrValue(d.med_dose_dialogue),
    toNullOrValue(d.med_replacement),
  ]);
  return { success: true, code };
}

// ===== Medical Supplies =====
async function insertMedsup(client, item_id, d) {
  const code = await generateAutoCode(client, {
    prefix: 'MS_',
    seqName: 'medsup_seq'
  });

  await client.query(`
    INSERT INTO medsup_detail (
      item_id, medsup_code, medsup_category, medsup_brand, 
      medsup_serial_no, medsup_status, medsup_price
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)
  `, [
    item_id,
    code,
    toNullOrValue(d.medsup_category),
    toNullOrValue(d.medsup_brand),
    toNullOrValue(d.medsup_serial_no),
    toNullOrValue(d.medsup_status),
    toNullOrFloat(d.medsup_price),
  ]);

  return { success: true, code };
}

// ===== Equipment =====
async function insertEquipment(client, item_id, d) {
  const code = await generateAutoCode(client, {
    prefix: 'EQP_',
    seqName: 'equipment_seq'
  });

  await client.query(`
    INSERT INTO equipment_detail (
      item_id, equip_code, equip_brand, equip_model, 
      equip_maintenance_cycle, equip_note
    ) VALUES ($1,$2,$3,$4,$5,$6)
  `, [
    item_id,
    code,
    toNullOrValue(d.equip_brand),
    toNullOrValue(d.equip_model),
    toNullOrValue(d.equip_maintenance_cycle),
    toNullOrValue(d.equip_note),
  ]);
  return { success: true, code };
}

// ===== Medical Devices =====
async function insertMedDevice(client, item_id, d) {
  const code = await generateAutoCode(client, {
    prefix: 'MD_',
    seqName: 'meddevices_seq'
  });

  await client.query(`
    INSERT INTO meddevices_detail (
      item_id, meddevice_code, meddevice_type, meddevice_brand,
      meddevice_model, meddevice_serial_no, meddevice_status,
      meddevice_price, meddevice_note
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
  `, [
    item_id,
    code,
    toNullOrValue(d.meddevice_type),
    toNullOrValue(d.meddevice_brand),
    toNullOrValue(d.meddevice_model),
    toNullOrValue(d.meddevice_serial_no),
    toNullOrValue(d.meddevice_status),
    toNullOrFloat(d.meddevice_price),
    toNullOrValue(d.meddevice_note),
  ]);
  return { success: true, code };
}

// ===== General Supplies =====
async function insertGeneral(client, item_id, d) {
  const code = await generateAutoCode(client, {
    prefix: 'GEN_',
    seqName: 'generalsup_seq'
  });

  await client.query(`
    INSERT INTO generalsup_detail (
      item_id, gen_code, gen_brand, gen_model, gen_spec, gen_price
    ) VALUES ($1,$2,$3,$4,$5,$6)
  `, [
    item_id,
    code,
    toNullOrValue(d.gen_brand),
    toNullOrValue(d.gen_model),
    toNullOrValue(d.gen_spec),
    toNullOrFloat(d.gen_price),
  ]);
  return { success: true, code };
}

// ===== Main =====
exports.createItemWithDetail = async function createItemWithDetail(data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const item_id = await addBaseItem(client, data);

    let detail;
    switch (data.item_category) {
      case 'medicine':
        detail = await insertMedicine(client, item_id, data);
        break;
      case 'medsup':
        detail = await insertMedsup(client, item_id, data);
        break;
      case 'equipment':
        detail = await insertEquipment(client, item_id, data);
        break;
      case 'meddevice':
        detail = await insertMedDevice(client, item_id, data);
        break;
      case 'general':
        detail = await insertGeneral(client, item_id, data);
        break;
      default:
        throw new Error(`ไม่รู้จักประเภทพัสดุ: ${data.item_category}`);
    }

    await client.query('COMMIT');
    return { success: true, item_id, detail_code: detail.code };
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) { }
    throw err;
  } finally {
    client.release();
  }
};
