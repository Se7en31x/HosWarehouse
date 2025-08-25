// backend/rules/checkReturnRequests.js
const { pool } = require("../../config/db");
const Notification = require("../../models/notificationModel");

async function checkReturnRequests() {
  console.log("⏳ Running rule: checkReturnRequests...");
  try {
    const RULE_RETURN_REQUEST = 6; // กำหนด rule_id ใหม่
    const TARGET_USER_ID = 999; // ระบุ user_id ที่ต้องการส่งแจ้งเตือน

    const currentDate = new Date();
    const sevenDaysLater = new Date(currentDate);
    sevenDaysLater.setDate(currentDate.getDate() + 7);

    // ค้นหาคำขอที่ใกล้ครบ 7 วัน
    const nearingReturns = await pool.query(
      `
      SELECT rd.request_detail_id, r.request_code, rd.expected_return_date, i.item_name, r.user_id AS borrower_id, 
             u.user_fname || ' ' || u.user_lname AS borrower_name
      FROM request_details rd
      JOIN requests r ON rd.request_id = r.request_id
      JOIN items i ON rd.item_id = i.item_id
      JOIN users u ON r.user_id = u.user_id
      WHERE rd.expected_return_date BETWEEN $1 AND $2 
      AND rd.borrow_status = 'borrowed'
      AND NOT EXISTS (
          SELECT 1 FROM borrow_returns br 
          WHERE br.request_detail_id = rd.request_detail_id 
          AND br.return_status = 'completed'
      )
      `,
      [currentDate, sevenDaysLater]
    );

    // ค้นหาคำขอที่เกินกำหนด
    const overdueReturns = await pool.query(
      `
      SELECT rd.request_detail_id, r.request_code, rd.expected_return_date, i.item_name, r.user_id AS borrower_id, 
             u.user_fname || ' ' || u.user_lname AS borrower_name
      FROM request_details rd
      JOIN requests r ON rd.request_id = r.request_id
      JOIN items i ON rd.item_id = i.item_id
      JOIN users u ON r.user_id = u.user_id
      WHERE rd.expected_return_date < $1 
      AND rd.borrow_status = 'borrowed'
      AND NOT EXISTS (
          SELECT 1 FROM borrow_returns br 
          WHERE br.request_detail_id = rd.request_detail_id 
          AND br.return_status = 'completed'
      )
      `,
      [currentDate]
    );

    // กระบวนการแจ้งเตือนสำหรับคำขอที่ใกล้ครบกำหนด
    for (const req of nearingReturns.rows) {
      const { rows: already } = await pool.query(
        `SELECT 1 FROM notification_log 
         WHERE rule_id = $1 AND related_table = 'request_details' AND related_id = $2`,
        [RULE_RETURN_REQUEST, req.request_detail_id]
      );
      if (already.length > 0) continue;

      const daysLeft = Math.ceil((new Date(req.expected_return_date) - currentDate) / (1000 * 60 * 60 * 24));
      const message = 
        `คำขอยืม ${req.item_name} (รหัส: ${req.request_code}) ใกล้ครบกำหนดคืนใน ${daysLeft} วัน\n` +
        `ผู้ยืม: ${req.borrower_name}\n` +
        `วันที่คาดคืน: ${new Date(req.expected_return_date).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}`;

      const title = `⚠️ ใกล้ครบกำหนดคืน (${req.request_code})`;

      // ส่งไปยังผู้ยืม
      await Notification.create(
        req.borrower_id,
        title,
        message,
        "return_nearing",
        "request_details",
        req.request_detail_id
      );

      // ส่งไปยัง user_id 999
      await Notification.create(
        TARGET_USER_ID,
        title,
        message,
        "return_nearing",
        "request_details",
        req.request_detail_id
      );

      // ส่งไปยังฝ่ายผู้ดูแลคลัง
      const managers = await pool.query(
        `SELECT user_id FROM users WHERE user_role = 'warehouse_manager'`
      );
      for (const mgr of managers.rows) {
        await Notification.create(
          mgr.user_id,
          title,
          message,
          "return_nearing",
          "request_details",
          req.request_detail_id
        );
      }

      await pool.query(
        `INSERT INTO notification_log (rule_id, related_table, related_id, sent_at)
         VALUES ($1, 'request_details', $2, NOW())`,
        [RULE_RETURN_REQUEST, req.request_detail_id]
      );

      console.log(`📡 Nearing Return Notified => request_code=${req.request_code}`);
    }

    // กระบวนการแจ้งเตือนสำหรับคำขอที่เกินกำหนด
    for (const req of overdueReturns.rows) {
      const { rows: already } = await pool.query(
        `SELECT 1 FROM notification_log 
         WHERE rule_id = $1 AND related_table = 'request_details' AND related_id = $2`,
        [RULE_RETURN_REQUEST, req.request_detail_id]
      );
      if (already.length > 0) continue;

      const daysOverdue = Math.ceil((currentDate - new Date(req.expected_return_date)) / (1000 * 60 * 60 * 24));
      const message = 
        `คำขอยืม (รหัส: ${req.request_code}) เกินกำหนดคืนมา ${daysOverdue} วัน\n` +
        `ผู้ยืม: ${req.borrower_name}\n` +
        `วันที่คาดคืน: ${new Date(req.expected_return_date).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}`;

      const title = `❌ เกินกำหนดคืน (${req.request_code})`;

      // ส่งไปยังผู้ยืม
      await Notification.create(
        req.borrower_id,
        title,
        message,
        "return_overdue",
        "request_details",
        req.request_detail_id
      );

      // ส่งไปยัง user_id 999
      await Notification.create(
        TARGET_USER_ID,
        title,
        message,
        "return_overdue",
        "request_details",
        req.request_detail_id
      );

      // ส่งไปยังฝ่ายผู้ดูแลคลัง
      const managers = await pool.query(
        `SELECT user_id FROM users WHERE user_role = 'warehouse_manager'`
      );
      for (const mgr of managers.rows) {
        await Notification.create(
          mgr.user_id,
          title,
          message,
          "return_overdue",
          "request_details",
          req.request_detail_id
        );
      }

      await pool.query(
        `INSERT INTO notification_log (rule_id, related_table, related_id, sent_at)
         VALUES ($1, 'request_details', $2, NOW())`,
        [RULE_RETURN_REQUEST, req.request_detail_id]
      );

      console.log(`📡 Overdue Return Notified => request_code=${req.request_code}`);
    }

    console.log(`✅ Return Alerts checked: ${nearingReturns.rows.length + overdueReturns.rows.length} items`);
  } catch (err) {
    console.error("❌ Error in checkReturnRequests:", err.message);
  }
}

module.exports = { checkReturnRequests };