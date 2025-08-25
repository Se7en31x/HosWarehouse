// backend/rules/checkExpiredItems.js
const { pool } = require("../../config/db");
const Notification = require("../../models/notificationModel");

async function checkExpiredItems() {
  console.log("⏳ Running rule: checkExpiredItems...");
  try {
    const RULE_EXPIRED = 1;      // rule_id: หมดอายุแล้ว
    const RULE_NEAR_EXPIRED = 2; // rule_id: ใกล้หมดอายุ

    // -----------------------------
    // 1) หาของที่ "หมดอายุแล้ว"
    // -----------------------------
    const { rows: expiredRows } = await pool.query(`
      SELECT l.lot_id, l.lot_no, l.qty_remaining, l.exp_date,
             i.item_id, i.item_name, i.item_unit,
             COALESCE(med.med_code, ms.medsup_code, eq.equip_code, md.meddevice_code, gs.gen_code) AS item_code
      FROM item_lots l
      JOIN items i ON i.item_id = l.item_id
      LEFT JOIN medicine_detail med ON med.item_id = i.item_id
      LEFT JOIN medsup_detail ms ON ms.item_id = i.item_id
      LEFT JOIN equipment_detail eq ON eq.item_id = i.item_id
      LEFT JOIN meddevices_detail md ON md.item_id = i.item_id
      LEFT JOIN generalsup_detail gs ON gs.item_id = i.item_id
      WHERE l.exp_date < CURRENT_DATE
        AND l.is_expired = false
        AND l.qty_remaining > 0
    `);

    for (const lot of expiredRows) {
      const { rows: already } = await pool.query(
        `SELECT 1 FROM notification_log 
         WHERE rule_id = $1 AND related_table = 'item_lots' AND related_id = $2`,
        [RULE_EXPIRED, lot.lot_id]
      );
      if (already.length > 0) continue;

      await pool.query(
        `INSERT INTO expired_items (lot_id, expired_qty, disposed_qty, expired_date, reported_by, note)
         VALUES ($1, $2, 0, CURRENT_DATE, NULL, 'ระบบตรวจจับอัตโนมัติ')`,
        [lot.lot_id, lot.qty_remaining]
      );

      await pool.query(
        `UPDATE item_lots
         SET is_expired = true, qty_remaining = 0
         WHERE lot_id = $1`,
        [lot.lot_id]
      );

      const expDateTime = new Date(lot.exp_date).toLocaleString("th-TH", {
        timeZone: "Asia/Bangkok",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });

      const message =
        `พัสดุ: ${lot.item_name} (${lot.item_code || "-"})\n` +
        `ล็อต: ${lot.lot_no || "-"} | จำนวน: ${lot.qty_remaining} ${lot.item_unit}\n` +
        `หมดอายุแล้วเมื่อ ${expDateTime}`;

      await Notification.create(
        999,
        "พบสินค้าหมดอายุ",
        message,
        "inventory",
        "item_lots",
        lot.lot_id
      );

      await pool.query(
        `INSERT INTO notification_log (rule_id, related_table, related_id, sent_at)
         VALUES ($1, 'item_lots', $2, NOW())`,
        [RULE_EXPIRED, lot.lot_id]
      );
    }

    // -----------------------------
    // 2) หาของที่ "ใกล้หมดอายุ"
    // -----------------------------
    const { rows: nearRows } = await pool.query(`
      SELECT l.lot_id, l.lot_no, l.qty_remaining, l.exp_date,
             i.item_id, i.item_name, i.item_unit,
             COALESCE(med.med_code, ms.medsup_code, eq.equip_code, md.meddevice_code, gs.gen_code) AS item_code
      FROM item_lots l
      JOIN items i ON i.item_id = l.item_id
      LEFT JOIN medicine_detail med ON med.item_id = i.item_id
      LEFT JOIN medsup_detail ms ON ms.item_id = i.item_id
      LEFT JOIN equipment_detail eq ON eq.item_id = i.item_id
      LEFT JOIN meddevices_detail md ON md.item_id = i.item_id
      LEFT JOIN generalsup_detail gs ON gs.item_id = i.item_id
      WHERE l.exp_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
        AND l.is_expired = false
        AND l.qty_remaining > 0
    `);

    for (const lot of nearRows) {
      const { rows: already } = await pool.query(
        `SELECT 1 FROM notification_log 
         WHERE rule_id = $1 AND related_table = 'item_lots' AND related_id = $2`,
        [RULE_NEAR_EXPIRED, lot.lot_id]
      );
      if (already.length > 0) continue;

      const expDate = new Date(lot.exp_date).toLocaleDateString("th-TH", {
        timeZone: "Asia/Bangkok"
      });

      const message =
        `พัสดุ: ${lot.item_name} (${lot.item_code || "-"})\n` +
        `ล็อต: ${lot.lot_no || "-"} | จำนวน: ${lot.qty_remaining} ${lot.item_unit}\n` +
        `ใกล้หมดอายุในวันที่ ${expDate}`;

      await Notification.create(
        999,
        "พบพัสดุใกล้หมดอายุ",
        message,
        "inventory",
        "item_lots",
        lot.lot_id
      );

      await pool.query(
        `INSERT INTO notification_log (rule_id, related_table, related_id, sent_at)
         VALUES ($1, 'item_lots', $2, NOW())`,
        [RULE_NEAR_EXPIRED, lot.lot_id]
      );
    }

    console.log(`✅ Expired: ${expiredRows.length} | Near Expired: ${nearRows.length}`);
  } catch (err) {
    console.error("❌ Error in checkExpiredItems:", err.message);
  }
}

module.exports = { checkExpiredItems };
