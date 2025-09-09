// services/purchasing/checkNewPurchaseRequests.js
const { pool } = require("../../config/db");
const Notification = require("../../models/notificationModel");
const { getIO } = require("../../socket");

async function checkNewPurchaseRequests() {
  const client = await pool.connect();
  const io = getIO();

  try {
    await client.query("BEGIN");

    const RULE_NEW_PR = 11; // ใช้เป็น rule กันซ้ำ

    // 1) ดึงผู้ใช้ role = purchasing_staff
    const { rows: purchasers } = await client.query(`
      SELECT user_id FROM "Admin".users
      WHERE role = 'purchasing_staff' AND is_active = true
    `);

    if (purchasers.length === 0) {
      console.warn("⚠️ No active purchasing users found");
      await client.query("ROLLBACK");
      return;
    }

    // 2) ดึง PR ใหม่ที่ยังไม่ได้แจ้งเตือน
    const { rows: prs } = await client.query(
      `
      SELECT pr.pr_id, pr.pr_no, pr.status, pr.created_at, u.username AS requester_name
      FROM purchase_requests pr
      JOIN "Admin".users u ON pr.requester_id = u.user_id
      WHERE NOT EXISTS (
        SELECT 1 FROM notification_log nl
        WHERE nl.rule_id = $1 
          AND nl.related_table = 'purchase_requests' 
          AND nl.related_id = pr.pr_id
      )
    `,
      [RULE_NEW_PR]
    );

    // 3) ส่งแจ้งเตือน
    for (const pr of prs) {
      const message =
        `มีคำขอสั่งซื้อใหม่\n` + // ✅ เปลี่ยนข้อความ
        `เลขที่ PR: ${pr.pr_no}\n` +
        `ผู้ขอ: ${pr.requester_name}\n` +
        `วันที่สร้าง: ${new Date(pr.created_at).toLocaleString("th-TH", {
          timeZone: "Asia/Bangkok",
        })}`;

      const title = `📝 คำขอสั่งซื้อใหม่ (${pr.pr_no})`; // ✅ เปลี่ยน title

      for (const p of purchasers) {
        const noti = await Notification.create(
          p.user_id,
          title,
          message,
          "purchase_request", // category
          "purchase_requests", // related_table
          pr.pr_id,
          client
        );
        io.to(`user_${p.user_id}`).emit("newNotification", noti);
      }

      // log กันซ้ำ
      await client.query(
        `INSERT INTO notification_log (rule_id, related_table, related_id, sent_at)
         VALUES ($1, 'purchase_requests', $2, NOW())`,
        [RULE_NEW_PR, pr.pr_id]
      );

    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error in checkNewPurchaseRequests:", err.message);
  } finally {
    client.release();
  }
}

module.exports = { checkNewPurchaseRequests };
