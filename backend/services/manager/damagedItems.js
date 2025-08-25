const { pool } = require("../../config/db");
const Notification = require("../../models/notificationModel");

async function reportDamaged(req, res) {
  try {
    const { item_id, damaged_qty, damaged_note, reported_by } = req.body;

    const result = await pool.query(
      `INSERT INTO damaged_items (item_id, damaged_qty, repaired_qty, disposed_qty, damaged_date, damaged_note, reported_by)
       VALUES ($1, $2, 0, 0, NOW(), $3, $4) RETURNING *`,
      [item_id, damaged_qty, damaged_note, reported_by]
    );
    const damaged = result.rows[0];

    const item = await pool.query(
      `SELECT item_name, item_unit FROM items WHERE item_id=$1`,
      [item_id]
    );
    const itemInfo = item.rows[0];

    const message =
      `พัสดุ: ${itemInfo.item_name}\n` +
      `จำนวนที่รายงานชำรุด: ${damaged.damaged_qty} ${itemInfo.item_unit}\n` +
      `วันที่รายงาน: ${new Date(damaged.damaged_date).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" })}`;

    const noti = await Notification.create(
      999,
      "มีการรายงานพัสดุชำรุดใหม่",
      message,
      "inventory",
      "damaged_items",
      damaged.damaged_id
    );

    res.status(201).json({ damaged, notification: noti });
  } catch (err) {
    console.error("❌ Error reportDamaged:", err.message);
    res.status(500).json({ error: "เกิดข้อผิดพลาด" });
  }
}

async function checkDamagedItems() {
  console.log("⏳ Running rule: checkDamagedItems...");
  try {
    const RULE_DAMAGED = 4;

    const { rows } = await pool.query(`
      SELECT d.damaged_id, d.item_id, d.damaged_qty, d.repaired_qty, d.disposed_qty, 
             d.damaged_date, d.damaged_note,
             i.item_name, i.item_unit,
             (COALESCE(d.damaged_qty,0) - (COALESCE(d.repaired_qty,0) + COALESCE(d.disposed_qty,0))) AS remaining_qty
      FROM damaged_items d
      JOIN items i ON i.item_id = d.item_id
    `);

    for (const dmg of rows) {
      const remaining = Number(dmg.remaining_qty);

      const logRes = await pool.query(
        `SELECT 1 FROM notification_log 
         WHERE rule_id = $1 AND related_table = 'damaged_items' AND related_id = $2`,
        [RULE_DAMAGED, dmg.damaged_id]
      );
      const hasLog = logRes.rows.length > 0;

      if (remaining > 0) {
        // 🔔 ยังเหลือ damaged ที่ไม่ได้จัดการ
        if (!hasLog) {
          const message =
            `พัสดุ: ${dmg.item_name}\n` +
            `คงเหลือที่ยังไม่ได้ดำเนินการ: ${remaining} ${dmg.item_unit}\n` +
            `จำนวนที่รายงานชำรุดทั้งหมด: ${dmg.damaged_qty} ${dmg.item_unit}\n` +
            `วันที่รายงาน: ${new Date(dmg.damaged_date).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" })}`;

          const noti = await Notification.create(
            999,
            "พบพัสดุชำรุดที่ยังไม่ดำเนินการ",
            message,
            "inventory",
            "damaged_items",
            dmg.damaged_id
          );

          await pool.query(
            `INSERT INTO notification_log (rule_id, related_table, related_id, sent_at)
             VALUES ($1, 'damaged_items', $2, NOW())`,
            [RULE_DAMAGED, dmg.damaged_id]
          );

          console.log("📡 DamagedItem created =>", JSON.stringify(noti, null, 2));
        }
      } else {
        // ✅ ถ้า repaired+disposed ครบ → reset log
        if (hasLog) {
          await pool.query(
            `DELETE FROM notification_log 
             WHERE rule_id = $1 AND related_table = 'damaged_items' AND related_id = $2`,
            [RULE_DAMAGED, dmg.damaged_id]
          );
          console.log(`♻️ Reset log for damaged_id=${dmg.damaged_id} (resolved)`);
        }
      }
    }

    console.log(`✅ Damaged rule checked: ${rows.length} items`);
  } catch (err) {
    console.error("❌ Error in checkDamagedItems:", err.message);
  }
}

module.exports = { reportDamaged, checkDamagedItems };
