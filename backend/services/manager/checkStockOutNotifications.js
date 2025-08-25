// backend/rules/checkStockOutNotifications.js
const { pool } = require("../../config/db");
const Notification = require("../../models/notificationModel");

async function checkStockOutNotifications() {
  console.log("⏳ Running rule: checkStockOutNotifications...");
  try {
    const RULE_STOCK_OUT = 7;
    const TARGET_USER_ID = 999;

    // การแปลประเภทการนำออก
    const stockoutTypeTranslations = {
      return_lost: "คืน - สูญหาย",
      borrow: "ยืม",
      withdraw: "เบิก",
      expired_dispose: "ทำลาย - หมดอายุ",
      default: "ไม่ระบุ",
    };

    // ✅ ดึงการนำออกที่ยังไม่ถูกแจ้งเตือน พร้อมข้อมูลที่ user-friendly
    const recentStockOuts = await pool.query(
      `
      SELECT so.stockout_id, so.stockout_no, so.stockout_date, so.stockout_type, so.user_id,
             r.request_code,
             u.user_fname || ' ' || u.user_lname AS creator_name,
             il.lot_no,
             i.item_name
      FROM stock_outs so
      LEFT JOIN requests r 
        ON so.note LIKE 'request#%' 
       AND r.request_id = CAST(SUBSTRING(so.note FROM 'request#(\\d+)') AS INTEGER)
      LEFT JOIN stock_out_details sod ON so.stockout_id = sod.stockout_id
      LEFT JOIN item_lots il ON sod.lot_id = il.lot_id
      LEFT JOIN items i ON sod.item_id = i.item_id
      LEFT JOIN users u ON so.user_id = u.user_id
      WHERE NOT EXISTS (
          SELECT 1 FROM notification_log nl
          WHERE nl.rule_id = $1 AND nl.related_table = 'stock_outs' AND nl.related_id = so.stockout_id
      )
      `,
      [RULE_STOCK_OUT]
    );

    for (const stockOut of recentStockOuts.rows) {
      // กันซ้ำ (ตรวจซ้ำอีกชั้น)
      const { rows: already } = await pool.query(
        `SELECT 1 FROM notification_log 
         WHERE rule_id = $1 AND related_table = 'stock_outs' AND related_id = $2`,
        [RULE_STOCK_OUT, stockOut.stockout_id]
      );
      if (already.length > 0) continue;

      // ✅ แปลประเภท
      const translatedType =
        stockoutTypeTranslations[stockOut.stockout_type] ||
        stockoutTypeTranslations["default"];

      // ✅ เตรียมข้อมูลอ้างอิง
      const lotInfo = stockOut.lot_no ? `Lot: ${stockOut.lot_no}` : "";
      const itemInfo = stockOut.item_name ? ` (${stockOut.item_name})` : "";
      const requestRef = stockOut.request_code
        ? `อ้างอิงคำขอ: ${stockOut.request_code}`
        : "";

      // ✅ ข้อความแจ้งเตือน (ไม่มีหมายเหตุแล้ว)
      const message =
        `มีการนำออกจากคลังสำเร็จ\n` +
        `เลขที่เอกสาร: ${stockOut.stockout_no}\n` +
        `ประเภทการนำออก: ${translatedType}\n` +
        `วันที่: ${new Date(stockOut.stockout_date).toLocaleString("th-TH", {
          timeZone: "Asia/Bangkok",
        })}\n` +
        `${lotInfo}${itemInfo ? " " + itemInfo : ""}\n` +
        (requestRef ? requestRef + "\n" : "") +
        `ผู้ดำเนินการ: ${stockOut.creator_name || "ไม่ทราบ"}`;

      const title = `📦 การนำออก (${stockOut.stockout_no})`;

      // ✅ บันทึก Notification
      await Notification.create(
        TARGET_USER_ID,
        title,
        message,
        "stock_out", // category
        "stock_outs", // related_table
        stockOut.stockout_id
      );

      // ✅ กันซ้ำ
      await pool.query(
        `INSERT INTO notification_log (rule_id, related_table, related_id, sent_at)
         VALUES ($1, 'stock_outs', $2, NOW())`,
        [RULE_STOCK_OUT, stockOut.stockout_id]
      );

      console.log(
        `📡 Stock Out Notified => stockout_no=${stockOut.stockout_no}, type=${translatedType}`
      );
    }

    console.log(
      `✅ Stock Out Alerts checked: ${recentStockOuts.rows.length} items`
    );
  } catch (err) {
    console.error("❌ Error in checkStockOutNotifications:", err.message);
  }
}

module.exports = { checkStockOutNotifications };
