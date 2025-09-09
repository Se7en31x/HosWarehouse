// backend/rules/checkReturnRequests.js
const { pool } = require("../../config/db");
const Notification = require("../../models/notificationModel");
const { getIO } = require("../../socket");

async function checkReturnRequests() {
  const io = getIO();
  const RULE_RETURN_REQUEST = 6;
  const now = new Date();
  const sevenDaysLater = new Date(now);
  sevenDaysLater.setDate(now.getDate() + 7);

  try {
    // ✅ ดึง manager
    const { rows: managers } = await pool.query(`
      SELECT user_id FROM "Admin".users
      WHERE role = 'warehouse_manager' AND is_active = true
    `);

    if (managers.length === 0) {
      console.warn("⚠️ No active warehouse_manager found");
    }

    // Helper function
    async function notifyReturn(type, req, extraMsg) {
      const title =
        type === "overdue"
          ? `❌ เกินกำหนดคืน (${req.request_code})`
          : `⚠️ ใกล้ครบกำหนดคืน (${req.request_code})`;

      const message =
        `คำขอยืม ${req.item_name} (รหัส: ${req.request_code}) ${extraMsg}\n` +
        `ผู้ยืม: ${req.borrower_name}\n` +
        `วันที่คาดคืน: ${new Date(req.expected_return_date).toLocaleString("th-TH", {
          timeZone: "Asia/Bangkok",
        })}`;

      // 📌 ผู้ยืม
      const borrowerNoti = await Notification.create(
        req.borrower_id,
        title,
        message,
        type === "overdue" ? "return_overdue" : "return_nearing",
        "request_details",
        req.request_detail_id
      );
      io.to(`user_${req.borrower_id}`).emit("newNotification", borrowerNoti);

      // 📌 ผู้จัดการ
      for (const mgr of managers) {
        const mgrNoti = await Notification.create(
          mgr.user_id,
          title,
          message,
          type === "overdue" ? "return_overdue" : "return_nearing",
          "request_details",
          req.request_detail_id
        );
        io.to(`user_${mgr.user_id}`).emit("newNotification", mgrNoti);
      }

      // กันซ้ำ
      await pool.query(
        `INSERT INTO notification_log (rule_id, related_table, related_id, sent_at)
         VALUES ($1, 'request_details', $2, NOW())`,
        [RULE_RETURN_REQUEST, req.request_detail_id]
      );
    }

    // -----------------------------
    // 1) ใกล้ครบกำหนดคืน
    // -----------------------------
    const { rows: nearing } = await pool.query(
      `
      SELECT rd.request_detail_id, r.request_code, rd.expected_return_date,
             i.item_name, r.user_id AS borrower_id,
             u.username AS borrower_name
      FROM request_details rd
      JOIN requests r ON rd.request_id = r.request_id
      JOIN items i ON rd.item_id = i.item_id
      JOIN "Admin".users u ON r.user_id = u.user_id
      WHERE rd.expected_return_date BETWEEN $1 AND $2
        AND rd.borrow_status = 'borrowed'
        AND NOT EXISTS (
          SELECT 1 FROM borrow_returns br
          WHERE br.request_detail_id = rd.request_detail_id
            AND br.return_status = 'completed'
        )
      `,
      [now, sevenDaysLater]
    );

    for (const req of nearing) {
      const { rows: already } = await pool.query(
        `SELECT 1 FROM notification_log 
         WHERE rule_id=$1 AND related_table='request_details' AND related_id=$2`,
        [RULE_RETURN_REQUEST, req.request_detail_id]
      );
      if (already.length > 0) continue;

      const daysLeft = Math.ceil((new Date(req.expected_return_date) - now) / (1000 * 60 * 60 * 24));
      await notifyReturn("nearing", req, `ใกล้ครบกำหนดคืนใน ${daysLeft} วัน`);
    }

    // -----------------------------
    // 2) เกินกำหนดคืน
    // -----------------------------
    const { rows: overdue } = await pool.query(
      `
      SELECT rd.request_detail_id, r.request_code, rd.expected_return_date,
             i.item_name, r.user_id AS borrower_id,
             u.username AS borrower_name
      FROM request_details rd
      JOIN requests r ON rd.request_id = r.request_id
      JOIN items i ON rd.item_id = i.item_id
      JOIN "Admin".users u ON r.user_id = u.user_id
      WHERE rd.expected_return_date < $1
        AND rd.borrow_status = 'borrowed'
        AND NOT EXISTS (
          SELECT 1 FROM borrow_returns br
          WHERE br.request_detail_id = rd.request_detail_id
            AND br.return_status = 'completed'
        )
      `,
      [now]
    );

    for (const req of overdue) {
      const { rows: already } = await pool.query(
        `SELECT 1 FROM notification_log 
         WHERE rule_id=$1 AND related_table='request_details' AND related_id=$2`,
        [RULE_RETURN_REQUEST, req.request_detail_id]
      );
      if (already.length > 0) continue;

      const daysOverdue = Math.ceil((now - new Date(req.expected_return_date)) / (1000 * 60 * 60 * 24));
      await notifyReturn("overdue", req, `เกินกำหนดคืนมา ${daysOverdue} วัน`);
    }
  } catch (err) {
    console.error("❌ Error in checkReturnRequests:", err.message);
  }
}

module.exports = { checkReturnRequests };
