// backend/rules/checkRequestStatus.js
const { pool } = require("../../config/db");
const Notification = require("../../models/notificationModel");
const { getIO } = require("../../socket");

async function checkRequestStatus() {
  const client = await pool.connect();
  const io = getIO();

  try {
    await client.query("BEGIN");
    const RULE_REQUEST_STATUS = 8; // rule_id สำหรับสถานะคำขอ

    // 🔍 หา requests ที่เปลี่ยนสถานะ
    const { rows } = await client.query(`
      SELECT r.request_id, r.request_code, r.request_status, r.user_id
      FROM requests r
      WHERE r.request_status IN ('approved_all', 'rejected_all', 'approved_partial')
        AND NOT EXISTS (
          SELECT 1 FROM notification_log nl
          WHERE nl.rule_id = $1
            AND nl.related_table = 'requests'
            AND nl.related_id = r.request_id
        )
    `, [RULE_REQUEST_STATUS]);

    for (const row of rows) {
      let message = "";
      let title = "อัปเดตคำขอ";

      switch (row.request_status) {
        case "approved_all":
          message = `คำขอ ${row.request_code} ได้รับการอนุมัติทั้งหมดแล้ว ✅`;
          break;
        case "rejected_all":
          message = `คำขอ ${row.request_code} ถูกปฏิเสธทั้งหมด ❌`;
          break;
        case "approved_partial":
          message = `คำขอ ${row.request_code} ได้รับการอนุมัติบางส่วน ℹ️`;
          break;
      }

      if (!message) continue;

      // ✅ สร้าง Notification
      const noti = await Notification.create(
        row.user_id,
        title,
        message,
        "request_status",
        "requests",
        row.request_id,
        client // ใช้ transaction
      );

      // ✅ ส่งให้ user ผ่าน socket
      io.to(`user_${row.user_id}`).emit("newNotification", noti);

      // ✅ log กันซ้ำ
      await client.query(
        `INSERT INTO notification_log (rule_id, related_table, related_id, sent_at)
         VALUES ($1, 'requests', $2, NOW())`,
        [RULE_REQUEST_STATUS, row.request_id]
      );

    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error checking request status notifications:", err.message);
  } finally {
    client.release();
  }
}

module.exports = { checkRequestStatus };
