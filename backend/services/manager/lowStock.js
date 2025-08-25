const { pool } = require("../../config/db");
const Notification = require("../../models/notificationModel");

async function checkLowStock() {
  console.log("⏳ Running rule: checkLowStock...");
  try {
    const RULE_LOW_STOCK = 3; // ใช้ hardcode id

    const { rows } = await pool.query(`
      SELECT i.item_id, i.item_name, i.item_unit, i.item_min,
             COALESCE(SUM(l.qty_remaining), 0) AS total_remaining
      FROM items i
      LEFT JOIN item_lots l 
             ON l.item_id = i.item_id 
            AND l.is_expired = false
      GROUP BY i.item_id, i.item_name, i.item_unit, i.item_min
      HAVING COALESCE(SUM(l.qty_remaining), 0) < i.item_min
    `);

    for (const item of rows) {
      // ✅ กันซ้ำด้วย notification_log
      const checkLog = await pool.query(
        `SELECT 1 FROM notification_log 
         WHERE rule_id = $1 AND related_table = 'items' AND related_id = $2`,
        [RULE_LOW_STOCK, item.item_id]
      );
      if (checkLog.rows.length > 0) continue; // เคยแจ้งแล้ว → ข้าม

      // ✅ message
      const message =
        `พัสดุ: ${item.item_name}\n` +
        `คงเหลือ: ${item.total_remaining} ${item.item_unit}\n` +
        `ต่ำกว่ากำหนดขั้นต่ำ (${item.item_min} ${item.item_unit})`;

      // ✅ insert notifications (create() จะ emit เอง)
      const noti = await Notification.create(
        999, // TODO: ภายหลังหาจาก role user จริง
        "พบพัสดุคงเหลือน้อยกว่ากำหนด",
        message,
        "inventory",
        "items",
        item.item_id
      );

      // ✅ log
      await pool.query(
        `INSERT INTO notification_log (rule_id, related_table, related_id, sent_at)
         VALUES ($1, 'items', $2, NOW())`,
        [RULE_LOW_STOCK, item.item_id]
      );

      console.log("📡 LowStock created =>", JSON.stringify(noti, null, 2));
    }

    console.log(`✅ Low Stock Alerts checked: ${rows.length}`);
  } catch (err) {
    console.error("❌ Error in checkLowStock:", err.message);
  }
}

module.exports = { checkLowStock };
