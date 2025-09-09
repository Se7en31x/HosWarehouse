// backend/rules/checkStockOutNotifications.js
const { pool } = require("../../config/db");
const Notification = require("../../models/notificationModel");
const { getIO } = require("../../socket");

async function checkStockOutNotifications() {
  try {
    const RULE_STOCK_OUT = 7;

    // ✅ ดึงผู้ใช้ที่เป็น warehouse_manager
    const { rows: managers } = await pool.query(`
      SELECT user_id FROM "Admin".users
      WHERE role = 'warehouse_manager' AND is_active = true
    `);

    if (managers.length === 0) {
      console.warn("⚠️ No active warehouse_manager found");
      return;
    }

    const io = getIO();

    const stockoutTypeTranslations = {
      return_lost: "คืน - สูญหาย",
      borrow: "ยืม",
      withdraw: "เบิก",
      expired_dispose: "ทำลาย - หมดอายุ",
      default: "ไม่ระบุ",
    };

    // ✅ ดึง stock_outs และรวม items
    const { rows: recentStockOuts } = await pool.query(
      `
      SELECT so.stockout_id, so.stockout_no, so.stockout_date, so.stockout_type, so.user_id,
             r.request_code,
             u.username AS creator_name,
             json_agg(
               json_build_object(
                 'lot_no', il.lot_no,
                 'item_name', i.item_name
               )
             ) AS items
      FROM stock_outs so
      LEFT JOIN requests r 
        ON so.note LIKE 'request#%' 
       AND r.request_id = CAST(SUBSTRING(so.note FROM 'request#(\\d+)') AS INTEGER)
      LEFT JOIN stock_out_details sod ON so.stockout_id = sod.stockout_id
      LEFT JOIN item_lots il ON sod.lot_id = il.lot_id
      LEFT JOIN items i ON sod.item_id = i.item_id
      LEFT JOIN "Admin".users u ON so.user_id = u.user_id
      WHERE NOT EXISTS (
          SELECT 1 FROM notification_log nl
          WHERE nl.rule_id = $1 AND nl.related_table = 'stock_outs' AND nl.related_id = so.stockout_id
      )
      GROUP BY so.stockout_id, so.stockout_no, so.stockout_date, so.stockout_type, so.user_id, r.request_code, u.username
      `,
      [RULE_STOCK_OUT]
    );

    for (const stockOut of recentStockOuts) {
      const translatedType =
        stockoutTypeTranslations[stockOut.stockout_type] ||
        stockoutTypeTranslations["default"];

      const itemsText = (stockOut.items || [])
        .map((it) => `- ${it.item_name || ""}${it.lot_no ? ` (Lot: ${it.lot_no})` : ""}`)
        .join("\n");

      const requestRef = stockOut.request_code
        ? `อ้างอิงคำขอ: ${stockOut.request_code}\n`
        : "";

      const message =
        `มีการนำออกจากคลังสำเร็จ\n` +
        `เลขที่เอกสาร: ${stockOut.stockout_no}\n` +
        `ประเภทการนำออก: ${translatedType}\n` +
        `วันที่: ${new Date(stockOut.stockout_date).toLocaleString("th-TH", {
          timeZone: "Asia/Bangkok",
        })}\n` +
        `${itemsText}\n` +
        requestRef +
        `ผู้ดำเนินการ: ${stockOut.creator_name || "ไม่ทราบ"}`;

      const title = `📦 การนำออก (${stockOut.stockout_no})`;

      // ✅ ส่งแจ้งเตือนให้ manager ทุกคน
      for (const manager of managers) {
        const noti = await Notification.create(
          manager.user_id,
          title,
          message,
          "stock_out",
          "stock_outs",
          stockOut.stockout_id
        );
        io.to(`user_${manager.user_id}`).emit("newNotification", noti);
      }

      // ✅ กันซ้ำ
      await pool.query(
        `INSERT INTO notification_log (rule_id, related_table, related_id, sent_at)
         VALUES ($1, 'stock_outs', $2, NOW())`,
        [RULE_STOCK_OUT, stockOut.stockout_id]
      );
    }

  } catch (err) {
    console.error("❌ Error in checkStockOutNotifications:", err.message);
  }
}

module.exports = { checkStockOutNotifications };
