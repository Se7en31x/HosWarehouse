const { pool } = require('../config/db');
const { generateStockoutCode } = require('../utils/stockoutCounter');

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
          i.is_borrowable,
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
       AND il.is_expired = false
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
          i.is_borrowable,
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
       AND il.is_expired = false
      WHERE i.item_id = $1 
        AND i.is_deleted = false
      GROUP BY
          i.item_id, m.med_id, ms.medsup_id, e.equip_id, md.meddevice_id, g.gen_id
      LIMIT 1;
    `;
    const itemResult = await pool.query(itemQuery, [id]);
    const item = itemResult.rows[0];
    if (!item) return null;

    // ✅ ดึง lots ของ item นี้
    const lotQuery = `
      SELECT 
          lot_id,
          lot_no,
          mfg_date,
          exp_date,
          import_date,
          qty_imported,
          qty_remaining AS remaining_qty,
          item_id
      FROM item_lots
      WHERE item_id = $1
        AND is_expired = false
      ORDER BY lot_id ASC;
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
// ดึงข้อมูลสำหรับหน้าเบิก-ยืม (สำหรับ Staff)
// ----------------------------------------------------------------------
exports.getAllItemsForWithdrawal = async () => {
  try {
    const query = `
      SELECT 
          i.item_id,
          i.item_name,
          i.item_category,
          i.item_location,
          i.item_zone,
          i.item_unit,
          i.item_status,
          i.item_img,
          i.is_borrowable,
          COALESCE(SUM(il.qty_remaining), 0) AS total_on_hand_qty,
          m.med_code, 
          ms.medsup_code,
          e.equip_code,
          md.meddevice_code,
          g.gen_code
      FROM items i
      LEFT JOIN item_lots il ON i.item_id = il.item_id 
          AND il.qty_remaining > 0 
          AND il.is_expired = false
      LEFT JOIN medicine_detail m ON i.item_id = m.item_id
      LEFT JOIN medsup_detail ms ON i.item_id = ms.item_id
      LEFT JOIN equipment_detail e ON i.item_id = e.item_id
      LEFT JOIN meddevices_detail md ON i.item_id = md.item_id
      LEFT JOIN generalsup_detail g ON i.item_id = g.item_id
      WHERE i.is_deleted = false
      GROUP BY 
          i.item_id, m.med_code, ms.medsup_code, e.equip_code, md.meddevice_code, g.gen_code
      ORDER BY 
          (CASE WHEN COALESCE(SUM(il.qty_remaining), 0) > 0 THEN 0 ELSE 1 END),
          i.item_name ASC;
    `;
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('❌ ดึงข้อมูล Inventory สำหรับเบิก-ยืมล้มเหลว:', error);
    throw error;
  }
};

// ----------------------------------------------------------------------
// แจ้งของชำรุด
// ----------------------------------------------------------------------
exports.reportDamaged = async ({
  lot_id,
  item_id,
  qty,
  note,
  damage_type,
  reported_by,
  source_type = "manual",
  source_ref_id = null
}) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) อัปเดตจำนวนใน lot
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

    // 2) Insert ลง damaged_items
    const insertLogQuery = `
      INSERT INTO damaged_items (
        lot_id, 
        item_id, 
        damaged_qty, 
        damaged_date, 
        damaged_note,
        damage_type,
        source_type,
        source_ref_id,
        damaged_status,
        reported_by
      )
      VALUES ($1,$2,$3,NOW(),$4,$5,$6,$7,$8,$9)
      RETURNING damaged_id;
    `;
    const damaged_status = "waiting";
    const { rows: damagedRows } = await client.query(insertLogQuery, [
      lot_id,
      item_id,
      qty,
      note || "",
      damage_type,
      source_type,
      source_ref_id,
      damaged_status,
      reported_by
    ]);
    const damaged_id = damagedRows[0].damaged_id;

    // 3) ✅ gen stockout_no
    const stockout_no = await generateStockoutCode(client);

    // 4) insert ลง stock_outs
    const { rows: stockoutRows } = await client.query(
      `INSERT INTO stock_outs 
        (stockout_no, stockout_date, stockout_type, note, user_id, created_at)
       VALUES ($1, NOW(), 'damaged', $2, $3, NOW())
       RETURNING stockout_id`,
      [stockout_no, `ชำรุดจากการตรวจสอบคลัง`, reported_by]
    );
    const stockout_id = stockoutRows[0].stockout_id;

    // 5) insert รายละเอียดลง stock_out_details
    const { rows: unitRows } = await client.query(
      `SELECT item_unit FROM items WHERE item_id = $1`,
      [item_id]
    );
    const itemUnit = unitRows[0]?.item_unit || "ชิ้น";

    await client.query(
      `INSERT INTO stock_out_details (stockout_id, item_id, lot_id, qty, unit, note)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [stockout_id, item_id, lot_id, qty, itemUnit, note || "แจ้งชำรุด"]
    );

    await client.query("COMMIT");
    return {
      success: true,
      message: "บันทึกของชำรุดเรียบร้อยแล้ว",
      damaged_id,
      stockout_id,
      stockout_no
    };

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ บันทึกของชำรุดล้มเหลว:", error);
    throw error;
  } finally {
    client.release();
  }
};

// ----------------------------------------------------------------------
// ปรับปรุงจำนวน (Inventory Adjustment)
// ----------------------------------------------------------------------
exports.adjustInventory = async ({
  lot_id,
  item_id,
  actual_qty,
  reason,
  reported_by
}) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) ดึงจำนวนปัจจุบัน + จำนวนที่นำเข้า
    const getCurrentQtyQuery = `
      SELECT qty_remaining, qty_imported 
      FROM item_lots 
      WHERE lot_id = $1 AND item_id = $2;
    `;
    const currentQtyResult = await client.query(getCurrentQtyQuery, [lot_id, item_id]);
    const row = currentQtyResult.rows[0];

    if (!row) {
      throw new Error("ไม่พบ Lot ที่ต้องการปรับปรุง");
    }

    const previous_qty = row.qty_remaining;
    const qty_imported = row.qty_imported;

    // ✅ Validation
    if (actual_qty < 0) {
      throw new Error("จำนวนต้องไม่ต่ำกว่า 0");
    }
    if (actual_qty > qty_imported) {
      throw new Error(`จำนวนต้องไม่มากกว่าที่นำเข้า (${qty_imported})`);
    }

    // 2) คำนวณส่วนต่าง
    const difference = actual_qty - previous_qty;

    // 3) อัปเดตจำนวนใน item_lots
    const updateLotQuery = `
      UPDATE item_lots
      SET qty_remaining = $1
      WHERE lot_id = $2 AND item_id = $3
      RETURNING *;
    `;
    await client.query(updateLotQuery, [actual_qty, lot_id, item_id]);

    // 4) Insert ลง inventory_adjustments
    const insertAdjustmentLogQuery = `
      INSERT INTO inventory_adjustments (
        lot_id,
        item_id,
        previous_qty,
        actual_qty,
        difference,
        reason,
        adjustment_date,
        adjusted_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7)
      RETURNING *;
    `;
    await client.query(insertAdjustmentLogQuery, [
      lot_id,
      item_id,
      previous_qty,
      actual_qty,
      difference,
      reason,
      reported_by
    ]);

    await client.query("COMMIT");
    return { success: true, message: "ปรับปรุงจำนวนเรียบร้อยแล้ว" };

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ บันทึกการปรับปรุง Inventory ล้มเหลว:", error);
    throw error;
  } finally {
    client.release();
  }
};
