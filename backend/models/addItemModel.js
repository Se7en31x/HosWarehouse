const { pool } = require('../config/db');
const { generateAutoCode } = require('../utils/generateCode');

// Helper function to handle empty strings for various data types
const toNullOrValue = (value) => value === '' ? null : value;
const toNullOrFloat = (value) => value === '' ? null : parseFloat(value);
const toNullOrInt = (value) => value === '' ? null : parseInt(value);

exports.addBaseItem = async (data) => {
    const query = `
        INSERT INTO items (
            item_name, item_category, item_unit,
            item_location, item_qty, item_min, item_max,
            item_img, item_zone, item_exp, item_barcode, item_sub_category
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        )
        RETURNING item_id;
    `;

    const values = [
        toNullOrValue(data.item_name),
        toNullOrValue(data.item_category),
        toNullOrValue(data.item_unit),
        toNullOrValue(data.item_location),
        toNullOrInt(data.item_qty),
        toNullOrInt(data.item_min),
        toNullOrInt(data.item_max),
        toNullOrValue(data.item_img), // แก้ไข: ใช้ item_img
        toNullOrValue(data.item_zone),
        toNullOrValue(data.item_exp),
        toNullOrValue(data.item_barcode),
        toNullOrValue(data.item_sub_category),
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
            med_tmt_code, med_tpu_code, med_tmt_gp_name, med_tmt_tp_name,
            med_severity, med_essential_med_list,
            med_pregnancy_cagetory, med_mfg, med_exp,
            med_dose_dialogue, med_replacement
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
        );
    `;

    const values = [
        item_id,
        med_code,
        toNullOrValue(data.med_generic_name),
        toNullOrValue(data.med_thai_name),
        toNullOrValue(data.med_marketing_name),
        toNullOrValue(data.med_counting_unit),
        toNullOrValue(data.med_dosage_form),
        toNullOrValue(data.med_medical_category),
        toNullOrFloat(data.med_cost_price),
        toNullOrFloat(data.med_selling_price),
        toNullOrFloat(data.med_medium_price),
        toNullOrValue(data.med_tmt_code || data.med_TMT_code),
        toNullOrValue(data.med_tpu_code || data.med_TPU_code),
        toNullOrValue(data.med_tmt_gp_name || data.med_TMT_GP_name),
        toNullOrValue(data.med_tmt_tp_name || data.med_TMT_TP_name),
        toNullOrValue(data.med_severity),
        toNullOrValue(data.med_essential_med_list),
        toNullOrValue(data.med_pregnancy_cagetory),
        toNullOrValue(data.med_mfg),
        toNullOrValue(data.med_exp),
        toNullOrValue(data.med_dose_dialogue),
        toNullOrValue(data.med_replacement),
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
            item_id, medsup_code, medsup_category, medsup_brand,
            medsup_serial_no, medsup_status, medsup_price
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7
        );
    `;
    const values = [
        item_id,
        medsup_code,
        toNullOrValue(data.medsup_category),
        toNullOrValue(data.medsup_brand),
        toNullOrValue(data.medsup_serial_no),
        toNullOrValue(data.medsup_status),
        toNullOrFloat(data.medsup_price),
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
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        );
    `;
    const values = [
        item_id,
        equip_code,
        toNullOrValue(data.equip_brand),
        toNullOrValue(data.equip_model),
        toNullOrValue(data.equip_serial_no),
        toNullOrValue(data.equip_status),
        toNullOrValue(data.equip_location),
        toNullOrFloat(data.equip_price),
        toNullOrValue(data.equip_purchase_date),
        toNullOrValue(data.equip_warranty_expire),
        toNullOrValue(data.equip_maintenance_cycle),
        toNullOrValue(data.equip_last_maintenance),
        toNullOrValue(data.equip_qr_code),
        toNullOrValue(data.equip_note),
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
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        );
    `;
    const values = [
        item_id,
        meddevice_code,
        toNullOrValue(data.meddevice_name),
        toNullOrValue(data.meddevice_type),
        toNullOrValue(data.meddevice_brand),
        toNullOrValue(data.meddevice_model),
        toNullOrValue(data.meddevice_serial_no),
        toNullOrValue(data.meddevice_status),
        toNullOrFloat(data.meddevice_price),
        toNullOrValue(data.meddevice_note),
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
        ) VALUES (
            $1, $2, $3, $4, $5, $6
        );
    `;
    const values = [
        item_id,
        gen_code,
        toNullOrValue(data.gen_brand),
        toNullOrValue(data.gen_model),
        toNullOrValue(data.gen_spec),
        toNullOrFloat(data.gen_price),
    ];
    await pool.query(query, values);
    return { success: true, code: gen_code };
};