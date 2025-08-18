const { pool } = require('../config/db');

// ----------------------------------------------------------------------
// ดึงข้อมูลทั้งหมด (All Items Detailed)
// ----------------------------------------------------------------------
exports.getAllItemsDetailed = async () => {
    try {
        const query = `
            SELECT 
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
                i.created_at,
                i.updated_at,
                i.item_img,
                m.med_id, m.med_code, m.med_generic_name, m.med_thai_name, m.med_marketing_name, m.med_counting_unit, m.med_dosage_form, m.med_medical_category, m.med_medium_price, m.med_tmt_code, m.med_tpu_code, m.med_tmt_gp_name, m.med_tmt_tp_name, m.med_severity, m.med_essential_med_list, m.med_pregnancy_category, m.med_dose_dialogue, m.med_replacement,
                ms.medsup_id, ms.medsup_category, ms.medsup_brand, ms.medsup_serial_no, ms.medsup_status, ms.medsup_code, ms.medsup_price,
                e.equip_id, e.equip_brand, e.equip_model, e.equip_maintenance_cycle, e.equip_note, e.equip_code,
                md.meddevice_id, md.meddevice_type, md.meddevice_brand, md.meddevice_model, md.meddevice_serial_no, md.meddevice_status, md.meddevice_price, md.meddevice_note, md.meddevice_code,
                g.gen_id, g.gen_brand, g.gen_model, g.gen_spec, g.gen_price, g.gen_code,
                COALESCE(SUM(il.qty_remaining), 0) AS total_on_hand_qty 
            FROM items i
            LEFT JOIN medicine_detail m ON i.item_id = m.item_id
            LEFT JOIN medsup_detail ms ON i.item_id = ms.item_id
            LEFT JOIN equipment_detail e ON i.item_id = e.item_id
            LEFT JOIN meddevices_detail md ON i.item_id = md.item_id
            LEFT JOIN generalsup_detail g ON i.item_id = g.item_id
            LEFT JOIN item_lots il 
              ON i.item_id = il.item_id 
             AND il.qty_remaining > 0 
             AND il.is_expired = false   -- ✅ ใช้ is_expired เป็นหลัก
            WHERE i.is_deleted = false
            GROUP BY 
                i.item_id, m.med_id, ms.medsup_id, e.equip_id, md.meddevice_id, g.gen_id
            ORDER BY i.item_id
            LIMIT 100;
        `;
        const result = await pool.query(query);
        return result.rows;
    } catch (error) {
        console.error('❌ ดึงข้อมูล Inventory ล้มเหลว:', error);
        throw error;
    }
};

// ----------------------------------------------------------------------
// ดึงข้อมูลรายการเดียว (โดย Id)
// ----------------------------------------------------------------------
exports.getItemById = async (id) => {
    try {
        const itemQuery = `
            SELECT
                i.*,
                m.med_id, m.med_code, m.med_generic_name, m.med_thai_name, m.med_marketing_name, m.med_counting_unit, m.med_dosage_form, m.med_medical_category, m.med_medium_price, m.med_tmt_code, m.med_tpu_code, m.med_tmt_gp_name, m.med_tmt_tp_name, m.med_severity, m.med_essential_med_list, m.med_pregnancy_category, m.med_dose_dialogue, m.med_replacement,
                ms.medsup_id, ms.medsup_category, ms.medsup_brand, ms.medsup_serial_no, ms.medsup_status, ms.medsup_code, ms.medsup_price,
                e.equip_id, e.equip_brand, e.equip_model, e.equip_maintenance_cycle, e.equip_note, e.equip_code,
                md.meddevice_id, md.meddevice_type, md.meddevice_brand, md.meddevice_model, md.meddevice_serial_no, md.meddevice_status, md.meddevice_price, md.meddevice_note, md.meddevice_code,
                g.gen_id, g.gen_brand, g.gen_model, g.gen_spec, g.gen_price, g.gen_code,
                COALESCE(SUM(il.qty_remaining), 0) AS total_on_hand_qty 
            FROM items i
            LEFT JOIN medicine_detail m ON i.item_id = m.item_id
            LEFT JOIN medsup_detail ms ON i.item_id = ms.item_id
            LEFT JOIN equipment_detail e ON i.item_id = e.item_id
            LEFT JOIN meddevices_detail md ON i.item_id = md.item_id
            LEFT JOIN generalsup_detail g ON i.item_id = g.item_id
            LEFT JOIN item_lots il 
              ON i.item_id = il.item_id 
             AND il.qty_remaining > 0 
             AND il.is_expired = false   -- ✅ ปรับมาใช้ is_expired เหมือนกัน
            WHERE i.item_id = $1 
              AND i.is_deleted = false
            GROUP BY
                i.item_id, m.med_id, ms.medsup_id, e.equip_id, md.meddevice_id, g.gen_id
            LIMIT 1;
        `;
        const itemResult = await pool.query(itemQuery, [id]);
        const item = itemResult.rows[0];
        if (!item) return null;

        // ดึง lots ของ item นี้
        const lotQuery = `
            SELECT 
                lot_id,
                lot_no,
                mfg_date,
                exp_date,
                import_date,
                qty_remaining AS remaining_qty,
                item_id
            FROM item_lots
            WHERE item_id = $1
              AND qty_remaining > 0
              AND is_expired = false   -- ✅ ใช้เหมือนกัน
            ORDER BY import_date DESC;
        `;
        const lotResult = await pool.query(lotQuery, [id]);
        item.lots = lotResult.rows;
        return item;
    } catch (error) {
        console.error("❌ ดึงข้อมูล Inventory (ById) ล้มเหลว:", error);
        throw error;
    }
};

// ----------------------------------------------------------------------
// แจ้งของชำรุด
// ----------------------------------------------------------------------
exports.reportDamaged = async ({ lot_id, item_id, qty, note, reported_by, damaged_type }) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const updateLotQuery = `
            UPDATE item_lots
            SET qty_remaining = qty_remaining - $1
            WHERE lot_id = $2 AND item_id = $3 AND qty_remaining >= $1
            RETURNING *;
        `;
        const lotResult = await client.query(updateLotQuery, [qty, lot_id, item_id]);

        if (lotResult.rowCount === 0) {
            throw new Error("จำนวนที่แจ้งชำรุดไม่ถูกต้อง หรือเกินจำนวนคงเหลือ");
        }
        
        // ✅ แก้ไขส่วนนี้เพื่อเพิ่ม reported_by และ damage_type
        const insertLogQuery = `
            INSERT INTO damaged_items (
                lot_id, 
                item_id, 
                damaged_qty, 
                damaged_date, 
                damaged_note,
                source_type,
                damaged_status,
                reported_by,
                damage_type
            )
            VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8)
            RETURNING *;
        `;
        
        // กำหนดค่าที่ต้องการ
        const damaged_status = 'pending';
        const source_type = 'manual';
        const note = 'บันทึกของชำรุดจากหน้ารายละเอียด';
        // ✅ ส่งค่าทั้งหมดตามลำดับ
        await client.query(insertLogQuery, [
            lot_id, 
            item_id, 
            qty, 
            note || "", 
            source_type, 
            damaged_status, 
            reported_by,
            damaged_type
        ]);

        await client.query("COMMIT");
        return { success: true, message: "บันทึกของชำรุดเรียบร้อยแล้ว" };
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("❌ บันทึกของชำรุดล้มเหลว:", error);
        throw error;
    } finally {
        client.release();
    }
};