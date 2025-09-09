// backend/rules/checkNewRequests.js
const { pool } = require("../../config/db");
const Notification = require("../../models/notificationModel");
const { getIO } = require("../../socket");

async function checkNewRequests() {
  const io = getIO();
  const RULE_NEW_REQUEST = 5;

  try {
    // ✅ ดึง Manager
    const { rows: managers } = await pool.query(`
      SELECT user_id 
      FROM "Admin".users
      WHERE role = 'warehouse_manager' AND is_active = true
    `);

    if (managers.length === 0) {
      console.warn("⚠️ No active warehouse_manager found");
      return;
    }

    // ✅ ดึงคำขอรออนุมัติ
    const { rows: requests } = await pool.query(`
      SELECT r.request_id, r.request_type, r.is_urgent, r.request_date, r.request_code,
             u.username AS requester_username
      FROM requests r
      JOIN "Admin".users u ON u.user_id = r.user_id
      WHERE r.request_status = 'waiting_approval'
    `);

    for (const req of requests) {
      // กันซ้ำ
      const { rows: already } = await pool.query(
        `SELECT 1 FROM notification_log 
         WHERE rule_id=$1 AND related_table='requests' AND related_id=$2`,
        [RULE_NEW_REQUEST, req.request_id]
      );
      if (already.length > 0) continue;

      // ✅ สร้างข้อความ
      const typeMap = { borrow: "คำขอยืม", withdraw: "คำขอเบิก" };
      const typeLabel = typeMap[req.request_type] || "คำขอ";
      const urgentLabel = req.is_urgent ? "⚠️ [ด่วน] " : "";

      const message =
        `${urgentLabel}${typeLabel} รหัส: ${req.request_code}\n` +
        `ผู้ขอ: ${req.requester_username}\n` +
        `วันที่ขอ: ${new Date(req.request_date).toLocaleString("th-TH", {
          timeZone: "Asia/Bangkok",
        })}`;

      const title = `${urgentLabel}${typeLabel}ใหม่ (${req.request_code})`;

      // ✅ แจ้งทุก manager
      for (const mgr of managers) {
        const noti = await Notification.create(
          mgr.user_id,
          title,
          message,
          "request",
          "requests",
          req.request_id
        );
        io.to(`user_${mgr.user_id}`).emit("newNotification", noti);
      }

      // ✅ log กันซ้ำ
      await pool.query(
        `INSERT INTO notification_log (rule_id, related_table, related_id, sent_at)
         VALUES ($1, 'requests', $2, NOW())`,
        [RULE_NEW_REQUEST, req.request_id]
      );
    }
  } catch (err) {
    console.error("❌ Error in checkNewRequests:", err.message);
  }
}

module.exports = { checkNewRequests };
