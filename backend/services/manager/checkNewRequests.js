// backend/rules/checkNewRequests.js
const { pool } = require("../../config/db");
const Notification = require("../../models/notificationModel");

async function checkNewRequests() {
  console.log("⏳ Running rule: checkNewRequests...");
  try {
    const RULE_NEW_REQUEST = 5;

    const { rows } = await pool.query(`
      SELECT r.request_id, r.request_type, r.is_urgent, r.request_date, r.request_code,
             u.user_fname || ' ' || u.user_lname AS requester_name
      FROM requests r
      JOIN users u ON u.user_id = r.user_id
      WHERE r.request_status = 'waiting_approval'
    `);

    for (const req of rows) {
      const { rows: already } = await pool.query(
        `SELECT 1 FROM notification_log 
         WHERE rule_id = $1 AND related_table = 'requests' AND related_id = $2`,
        [RULE_NEW_REQUEST, req.request_id]
      );
      if (already.length > 0) continue;

      const typeLabel = req.request_type === "borrow" ? "คำขอยืม" : "คำขอเบิก";
      const urgentLabel = req.is_urgent ? "⚠️ [ด่วน] " : "";

      const message =
        `${urgentLabel}${typeLabel} รหัส: ${req.request_code}\n` +
        `ผู้ขอ: ${req.requester_name}\n` +
        `วันที่ขอ: ${new Date(req.request_date).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}`;

      const title = `${urgentLabel}${typeLabel}ใหม่ (${req.request_code})`;

      // 👉 ส่งให้ Manager / Admin
      const managers = await pool.query(`
        SELECT user_id 
        FROM users 
        WHERE user_role IN ('inventory_manager', 'Administrator', 'manager')
      `);

      for (const mgr of managers.rows) {
        await Notification.create(
          mgr.user_id,
          title,
          message,
          "request",
          "requests",
          req.request_id
        );
      }

      await pool.query(
        `INSERT INTO notification_log (rule_id, related_table, related_id, sent_at)
         VALUES ($1, 'requests', $2, NOW())`,
        [RULE_NEW_REQUEST, req.request_id]
      );

      console.log(`📡 New Request Notified => request_id=${req.request_id}`);
    }

    console.log(`✅ Request Alerts checked: ${rows.length}`);
  } catch (err) {
    console.error("❌ Error in checkNewRequests:", err.message);
  }
}

module.exports = { checkNewRequests };
