const { pool } = require('../config/db');
const { generateAutoCode } = require('../utils/generateCode');

exports.addBaseItem = async (data) => {
  const query = `
    INSERT INTO items (
      item_name, item_category, item_unit,
      item_location, item_qty, item_min, item_max, item_img, item_zone,item_exp
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8 ,$9,$10)
    RETURNING item_id
  `;

  const values = [
    data.item_name,
    data.item_category,
    data.item_unit,
    data.item_location,
    data.item_qty || 0,
    data.item_min || 0,
    data.item_max || 0,
    data.item_image || null,
    data.item_zone,
    data.item_exp,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};
// -- 1. Medicine

exports.insertMedicine = async (item_id, data) => {
  const med_code = await generateAutoCode(pool, {
    prefix: 'MED_',
    tableName: 'medicine_detail',
    codeField: 'med_code',
    orderBy: 'med_id',
  });

  const query = `
    INSERT INTO medicine_detail (
      item_id, med_code,
      med_generic_name, med_thai_name, med_marketing_name, med_counting_unit,
      med_dosage_form, med_medical_category,
      med_cost_price, med_selling_price, med_medium_price,
      med_TMT_code, med_TPU_code, med_TMT_GP_name, med_TMT_TP_name,
      med_severity, med_essential_med_list,
      med_pregnancy_cagetory, med_mfg, med_exp,
      med_dose_dialogue, med_replacement
    ) VALUES (
      $1, $2,
      $3, $4, $5, $6,
      $7, $8,
      $9, $10, $11,
      $12, $13, $14, $15,
      $16, $17, $18,
      $19, $20, $21,
      $22 
    )
  `;

  const values = [
    item_id,
    med_code,
    data.med_generic_name || '',
    data.med_thai_name || '',
    data.med_marketing_name || '',
    data.med_counting_unit || '',
    data.med_dosage_form || '',
    data.med_medical_category || '',
    data.med_cost_price === '' ? null : parseFloat(data.med_cost_price),
    data.med_selling_price === '' ? null : parseFloat(data.med_selling_price),
    data.med_medium_price === '' ? null : parseFloat(data.med_medium_price),
    data.med_TMT_code || '',
    data.med_TPU_code || '',
    data.med_TMT_GP_name || '',
    data.med_TMT_TP_name || '',
    data.med_severity || '',
    data.med_essential_med_list || '',
    data.med_pregnancy_cagetory || '',
    data.med_mfg || null,
    data.med_exp || null,
    data.med_dose_dialogue || '',
    data.med_replacement || '',
  ];

  await pool.query(query, values);
  return { success: true, code: med_code };
};



// -- 2. Medical Supplies
exports.insertMedsup = async (item_id, data) => {
  const medsup_code = await generateAutoCode(pool, {
    prefix: 'MS_',
    tableName: 'medsup_detail',
    codeField: 'medsup_code',
    orderBy: 'medsup_id'
  });

  const query = `
    INSERT INTO medsup_detail (
      item_id, medsup_code, medsup_category,medsup_brand,
      medsup_serial_no, medsup_status
    ) VALUES ($1,$2,$3,$4,$5,$6)
  `;
  const values = [
    item_id,
    medsup_code,
    data.medsup_category,
    data.medsup_brand,
    data.medsup_serial_no,
    data.medsup_status,
  ];
  await pool.query(query, values);
  return { success: true, code: medsup_code };
};


// -- 3. Equipment
exports.insertEquipment = async (item_id, data) => {
  const equip_code = await generateAutoCode(pool, {
    prefix: 'EQP_',
    tableName: 'equipment_detail',
    codeField: 'equip_code',
    orderBy: 'equip_id'
  });

  const query = `
    INSERT INTO equipment_detail (
      item_id, equip_code, equip_brand, equip_model, equip_serial_no,
      equip_status, equip_location, equip_price,
      equip_purchase_date, equip_warranty_expire, equip_maintenance_cycle,
      equip_last_maintenance, equip_qr_code, equip_note
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
  `;
  const values = [
    item_id,
    equip_code, // ✅ ใช้ค่าที่ generate มา
    data.equip_brand,
    data.equip_model,
    data.equip_serial_no,
    data.equip_status,
    data.equip_location,
    data.equip_price,
    data.equip_purchase_date,
    data.equip_warranty_expire,
    data.equip_maintenance_cycle,
    data.equip_last_maintenance,
    data.equip_qr_code,
    data.equip_note
  ];
  await pool.query(query, values);
  return { success: true, code: equip_code };
};

// -- 4. Medical Devices
exports.insertMedDevice = async (item_id, data) => {
  const meddevice_code = await generateAutoCode(pool, {
    prefix: 'MD_',
    tableName: 'meddevices_detail',
    codeField: 'meddevice_code',
    orderBy: 'meddevice_id'
  });

  const query = `
    INSERT INTO meddevices_detail (
      item_id, meddevice_code, meddevice_name, meddevice_type, meddevice_brand,
      meddevice_model, meddevice_serial_no, meddevice_status,
      meddevice_price, meddevice_note
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
  `;
  const values = [
    item_id,
    meddevice_code,
    data.meddevice_name,
    data.meddevice_type,
    data.meddevice_brand,
    data.meddevice_model,
    data.meddevice_serial_no,
    data.meddevice_status,
    data.meddevice_price,
    data.meddevice_note
  ];
  await pool.query(query, values);
  return { success: true, code: meddevice_code };
};


// -- 5. General Supplies
exports.insertGeneral = async (item_id, data) => {
  const gen_code = await generateAutoCode(pool, {
    prefix: 'GEN_',
    tableName: 'generalsup_detail',
    codeField: 'gen_code',
    orderBy: 'gen_id'
  });

  const query = `
    INSERT INTO generalsup_detail (
      item_id, gen_code, gen_brand, gen_model, gen_spec, gen_price
    ) VALUES ($1,$2,$3,$4,$5,$6)
  `;
  const values = [
    item_id,
    gen_code,
    data.gen_brand,
    data.gen_model,
    data.gen_spec,
    data.gen_price
  ];
  await pool.query(query, values);
  return { success: true, code: gen_code };
};


// exports.createItem = async (data) => {
//   console.log('createItem data:', data);
//   const client = await pool.connect();

//   try {
//     await client.query('BEGIN');

//     // 1. Insert into items
//     const itemQuery = `
//       INSERT INTO items (item_name, item_category, item_unit, item_location, item_qty, item_min, item_max, item_img)
//       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
//       RETURNING item_id
//     `;
//     const itemValues = [
//       data.item_name,
//       data.item_category,
//       data.item_unit,
//       data.item_location,
//       data.item_qty || 0,
//       data.item_min || 0,
//       data.item_max || null,
//       data.item_img || null
//     ];
//     const result = await client.query(itemQuery, itemValues);
//     const itemId = result.rows[0].item_id;

//     // 2. Insert into detail table based on category
//     switch (data.item_category) {
//       case 'general':
//         await client.query(
//           `INSERT INTO generalsup_detail (item_id, gen_brand, gen_model, gen_spec, gen_price)
//            VALUES ($1, $2, $3, $4, $5)`,
//           [itemId, data.gen_brand, data.gen_model, data.gen_spec, data.gen_price]
//         );
//         break;

//       case 'medsup':
//         await client.query(
//           `INSERT INTO medsup_detail (item_id, medsup_category, medsup_name, medsup_brand, medsup_serial_no, medsup_status, medsup_expiry_date, medsup_qty, medsup_price)
//            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
//           [
//             itemId,
//             data.medsup_category,
//             data.medsup_name,
//             data.medsup_brand,
//             data.medsup_serial_no,
//             data.medsup_status,
//             data.medsup_expiry_date,
//             data.medsup_qty,
//             data.medsup_price
//           ]
//         );
//         break;

//       case 'equipment':
//         await client.query(
//           `INSERT INTO equipment_detail (
//             item_id, equip_brand, equip_model, equip_serial_no,
//             equip_status, equip_location, equip_price,
//             equip_purchase_date, equip_warranty_expire, equip_maintenance_cycle,
//             equip_last_maintenance, equip_qr_code, equip_note
//           )
//           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
//           [
//             itemId,
//             data.equip_brand,
//             data.equip_model,
//             data.equip_serial_no,
//             data.equip_status,
//             data.equip_location,
//             data.equip_price,
//             data.equip_purchase_date,
//             data.equip_warranty_expire,
//             data.equip_maintenance_cycle,
//             data.equip_last_maintenance,
//             data.equip_qr_code,
//             data.equip_note
//           ]
//         );
//         break;

//       case 'meddevice':
//         await client.query(
//           `INSERT INTO meddevices_detail (
//             item_id, meddevice_name, meddevice_type, meddevice_brand,
//             meddevice_model, meddevice_serial_no, meddevice_status,
//             meddevice_price, meddevice_note
//           )
//           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
//           [
//             itemId,
//             data.meddevice_name,
//             data.meddevice_type,
//             data.meddevice_brand,
//             data.meddevice_model,
//             data.meddevice_serial_no,
//             data.meddevice_status,
//             data.meddevice_price,
//             data.meddevice_note
//           ]
//         );
//         break;

//       // เว้น medicine ไว้ก่อน เพราะยังไม่มี column
//     }

//     await client.query('COMMIT');
//     return { success: true, item_id: itemId };

//   } catch (error) {
//     await client.query('ROLLBACK');
//     console.error('❌ Error creating item:', error);
//     throw error;
//   } finally {
//     client.release();
//   }
// };
