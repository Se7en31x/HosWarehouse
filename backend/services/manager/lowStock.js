const { pool } = require("../../config/db");
const Notification = require("../../models/notificationModel");
const { getIO } = require("../../socket");

async function checkLowStock() {

  const RULE_LOW_STOCK = 3;

  try {
    // 🔍 1. Query items ที่ต่ำกว่าขั้นต่ำ
    const { rows: items } = await pool.query(`
      SELECT i.item_id, i.item_name, i.item_unit, i.item_min, i.item_max, 
             i.item_category, i.item_purchase_unit,
             COALESCE(SUM(l.qty_remaining), 0) AS total_remaining
      FROM items i
      LEFT JOIN item_lots l 
             ON l.item_id = i.item_id 
            AND l.is_expired = false
      GROUP BY i.item_id, i.item_name, i.item_unit, 
               i.item_min, i.item_max, i.item_category, i.item_purchase_unit
      HAVING COALESCE(SUM(l.qty_remaining), 0) < i.item_min
    `);

    // 🔍 2. Query users ที่เป็น warehouse_manager
    const { rows: users } = await pool.query(`
      SELECT user_id FROM "Admin".users 
      WHERE role = 'warehouse_manager' AND is_active = true
    `);

    if (users.length === 0) {
      console.warn("⚠️ No active warehouse_manager found");
    }

    for (const item of items) {
      // กันซ้ำ
      const { rows: checkLog } = await pool.query(
        `SELECT 1 FROM notification_log 
         WHERE rule_id = $1 AND related_table = 'items' AND related_id = $2`,
        [RULE_LOW_STOCK, item.item_id]
      );
      if (checkLog.length > 0) {
        continue;
      }

      const requested_qty = item.item_max
        ? item.item_max - item.total_remaining
        : item.item_min;

      const message =
        `พัสดุ: ${item.item_name}\n` +
        `คงเหลือ: ${item.total_remaining} ${item.item_unit}\n` +
        `ต่ำกว่ากำหนดขั้นต่ำ (${item.item_min} ${item.item_unit})\n` +
        `เพิ่มลงตะกร้าสั่งซื้อ: ${requested_qty} ${item.item_unit}`;

      // 🔔 3. ใช้ NotificationModel.create → มัน emit ให้อัตโนมัติแล้ว
      for (const u of users) {
        await Notification.create(
          u.user_id,
          "พบพัสดุคงเหลือน้อยกว่ากำหนดและเพิ่มลงตะกร้า",
          message,
          "inventory",
          "items",
          item.item_id
        );
      }

      // ✅ 4. log กันซ้ำ
      await pool.query(
        `INSERT INTO notification_log (rule_id, related_table, related_id, sent_at)
         VALUES ($1, 'items', $2, NOW())`,
        [RULE_LOW_STOCK, item.item_id]
      );

      // 📡 5. Emit event → สำหรับ cart (broadcast)
      const io = getIO();
      io.emit("lowStockItem", {
        item_id: item.item_id,
        item_name: item.item_name,
        item_unit: item.item_unit,
        item_purchase_unit: item.item_purchase_unit,
        item_category: item.item_category,
        current_stock: item.total_remaining,
        requested_qty,
        note: `เพิ่มอัตโนมัติ: คงเหลือ (${item.total_remaining}) ต่ำกว่าขั้นต่ำ (${item.item_min})`,
      });


    }

  } catch (err) {
    console.error("❌ Error in checkLowStock:", err.message);
  }
}

module.exports = { checkLowStock };
