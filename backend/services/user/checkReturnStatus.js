// backend/rules/checkReturnStatus.js
const { pool } = require("../../config/db");
const Notification = require("../../models/notificationModel");
const { getIO } = require("../../socket");

async function checkReturnStatus() {
  const client = await pool.connect();
  const io = getIO();

  try {
    await client.query("BEGIN");
    const RULE_RETURN_STATUS = 9; // rule_id สำหรับ return status

    const { rows } = await client.query(`
      SELECT br.return_id, br.return_code, br.return_status, r.user_id
      FROM borrow_returns br
      JOIN request_details rd ON br.request_detail_id = rd.request_detail_id
      JOIN requests r ON rd.request_id = r.request_id
      WHERE br.return_status IN ('completed', 'rejected')
        AND NOT EXISTS (
          SELECT 1 FROM notification_log nl
          WHERE nl.rule_id = $1
            AND nl.related_table = 'borrow_returns'
            AND nl.related_id = br.return_id
        )
    `, [RULE_RETURN_STATUS]);

    for (const row of rows) {
      let message = "";
      switch (row.return_status) {
        case "completed":
          message = `การคืน ${row.return_code} ของคุณเสร็จสิ้นแล้ว ✅`;
          break;
        case "rejected":
          message = `การคืน ${row.return_code} ของคุณถูกปฏิเสธ ❌`;
          break;
      }

      if (!message) continue;

      // ✅ สร้าง Notification
      const noti = await Notification.create(
        row.user_id,
        "อัปเดตการคืน",
        message,
        "return_status",   // category
        "borrow_returns",  // related_table
        row.return_id,     // related_id
        client             // transaction
      );

      // ✅ ยิง socket real-time
      io.to(`user_${row.user_id}`).emit("newNotification", noti);

      // ✅ กันซ้ำ
      await client.query(
        `INSERT INTO notification_log (rule_id, related_table, related_id, sent_at)
         VALUES ($1, 'borrow_returns', $2, NOW())`,
        [RULE_RETURN_STATUS, row.return_id]
      );

      console.log(`📡 ReturnStatus Notified => user_${row.user_id}, code=${row.return_code}`);
    }

    await client.query("COMMIT");
    console.log(`✅ Return Status checked: ${rows.length}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error in checkReturnStatus:", err.message);
  } finally {
    client.release();
  }
}

module.exports = { checkReturnStatus };
