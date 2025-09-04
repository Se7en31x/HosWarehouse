const {pool} = require("../../config/db");
const NotificationModel = require("../../models/notificationModel");

async function checkReturnStatus() {
  try {
    const { rows } = await pool.query(`
      SELECT br.return_id, br.return_code, br.return_status, r.user_id
      FROM borrow_returns br
      JOIN request_details rd ON br.request_detail_id = rd.request_detail_id
      JOIN requests r ON rd.request_id = r.request_id
      WHERE br.return_status IN ('completed', 'rejected')
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.related_table = 'borrow_returns'
            AND n.related_id = br.return_id
            AND n.category = 'return_status'
        )
    `);

    for (const row of rows) {
      let message = "";
      if (row.return_status === "completed") {
        message = `การคืน ${row.return_code} ของคุณเสร็จสิ้นแล้ว ✅`;
      } else if (row.return_status === "rejected") {
        message = `การคืน ${row.return_code} ของคุณถูกปฏิเสธ ❌`;
      }

      if (message) {
        await NotificationModel.create(
          row.user_id,
          "อัปเดตการคืน",
          message,
          "return_status",   // category
          "borrow_returns",  // related_table
          row.return_id      // related_id
        );

        console.log(`ส่งแจ้งเตือนไปยัง user_${row.user_id}: ${message}`);
      }
    }
  } catch (err) {
    console.error("Error checking return status notifications:", err);
  }
}

module.exports = { checkReturnStatus };
