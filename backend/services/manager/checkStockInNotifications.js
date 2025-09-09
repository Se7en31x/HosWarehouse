// backend/rules/checkStockInNotifications.js
const { pool } = require("../../config/db");
const Notification = require("../../models/notificationModel");
const { getIO } = require("../../socket");

async function checkStockInNotifications() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const RULE_STOCK_IN = 10; // กำหนด rule_id สำหรับ stock in

    // ✅ ดึง warehouse_manager
    const { rows: managers } = await client.query(`
      SELECT user_id 
      FROM "Admin".users
      WHERE role = 'warehouse_manager' AND is_active = true
    `);

    if (managers.length === 0) {
      console.warn("⚠️ No active warehouse_manager found");
      await client.query("ROLLBACK");
      return;
    }

    const io = getIO();

    // ✅ ดึง stock_in รายการที่ยังไม่ถูกแจ้งเตือน
    const { rows: recentStockIns } = await client.query(
      `
      SELECT si.stockin_id, si.stockin_no, si.stockin_date, si.stockin_type, 
             u.username AS creator_name,
             json_agg(
               json_build_object(
                 'item_name', i.item_name,
                 'lot_no', il.lot_no,
                 'qty', sid.qty,
                 'unit', sid.unit
               )
             ) AS items
      FROM stock_ins si
      LEFT JOIN stock_in_details sid ON si.stockin_id = sid.stockin_id
      LEFT JOIN items i ON sid.item_id = i.item_id
      LEFT JOIN item_lots il ON sid.lot_id = il.lot_id
      LEFT JOIN "Admin".users u ON si.user_id = u.user_id
      WHERE NOT EXISTS (
          SELECT 1 FROM notification_log nl
          WHERE nl.rule_id = $1 
            AND nl.related_table = 'stock_ins' 
            AND nl.related_id = si.stockin_id
      )
      GROUP BY si.stockin_id, si.stockin_no, si.stockin_date, si.stockin_type, u.username
      `,
      [RULE_STOCK_IN]
    );

    for (const stockIn of recentStockIns) {
      const itemsText = (stockIn.items || [])
        .map(
          (it) =>
            `- ${it.item_name || ""} ${it.qty || 0} ${it.unit || ""}${
              it.lot_no ? ` (Lot: ${it.lot_no})` : ""
            }`
        )
        .join("\n");

      const message =
        `มีการนำเข้าคลังสำเร็จ\n` +
        `เลขที่เอกสาร: ${stockIn.stockin_no}\n` +
        `ประเภทการนำเข้า: ${stockIn.stockin_type || "ไม่ระบุ"}\n` +
        `วันที่: ${new Date(stockIn.stockin_date).toLocaleString("th-TH", {
          timeZone: "Asia/Bangkok",
        })}\n` +
        `${itemsText}\n` +
        `ผู้ดำเนินการ: ${stockIn.creator_name || "ไม่ทราบ"}`;

      const title = `📥 การนำเข้า (${stockIn.stockin_no})`;

      for (const mgr of managers) {
        const noti = await Notification.create(
          mgr.user_id,
          title,
          message,
          "stock_in",
          "stock_ins",
          stockIn.stockin_id,
          client
        );
        io.to(`user_${mgr.user_id}`).emit("newNotification", noti);
      }

      await client.query(
        `INSERT INTO notification_log (rule_id, related_table, related_id, sent_at)
         VALUES ($1, 'stock_ins', $2, NOW())`,
        [RULE_STOCK_IN, stockIn.stockin_id]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error in checkStockInNotifications:", err.message);
  } finally {
    client.release();
  }
}

module.exports = { checkStockInNotifications };
