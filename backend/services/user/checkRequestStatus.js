const {pool} = require("../../config/db");
const NotificationModel = require("../../models/notificationModel");

async function checkRequestStatus() {
  try {
    const { rows } = await pool.query(`
      SELECT r.request_id, r.request_code, r.request_status, r.user_id
      FROM requests r
      WHERE r.request_status IN ('approved_all', 'rejected_all', 'approved_partial')
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.related_table = 'requests'
            AND n.related_id = r.request_id
            AND n.category = 'request_status'
        )
    `);

    for (const row of rows) {
      let message = "";

      if (row.request_status === "approved_all") {
        message = `คำขอ ${row.request_code} ได้รับการอนุมัติทั้งหมดแล้ว ✅`;
      } else if (row.request_status === "rejected_all") {
        message = `คำขอ ${row.request_code} ถูกปฏิเสธทั้งหมด ❌`;
      } else if (row.request_status === "approved_partial") {
        message = `คำขอ ${row.request_code} ได้รับการอนุมัติบางส่วน ℹ️`;
      }

      if (message) {
        await NotificationModel.create(
          row.user_id,
          "อัปเดตคำขอ",
          message,
          "request_status", // category
          "requests",       // related_table
          row.request_id    // related_id
        );

        console.log(`ส่งแจ้งเตือนไปยัง user_${row.user_id}: ${message}`);
      }
    }
  } catch (err) {
    console.error("Error checking request status notifications:", err);
  }
}

module.exports = { checkRequestStatus };
