// const { getIO } = require("../ioInstance");
// const pool = require("../config/db");

// // รันทุก 1 นาที
// async function checkNotificationRules() {
//   const rules = await pool.query(`SELECT * FROM notification_rules WHERE is_active = true`);
  
//   for (const rule of rules.rows) {
//     const { rule_id, related_table, trigger_column, operator, value, template_title, template_message } = rule;
    
//     const query = `
//       SELECT * FROM ${related_table}
//       WHERE ${trigger_column} ${operator} $1
//     `;
//     const result = await pool.query(query, [value]);

//     for (const row of result.rows) {
//       const relatedId = row.id || row[trigger_column]; // เลือก key ของแถว

//       // ตรวจ log กันยิงซ้ำ
//       const logCheck = await pool.query(
//         `SELECT 1 FROM notification_log
//          WHERE rule_id=$1 AND related_id=$2
//          AND sent_at > NOW() - interval '24 hours'`,
//         [rule_id, relatedId]
//       );

//       if (logCheck.rows.length === 0) {
//         // insert notification
//         const notiRes = await pool.query(
//           `INSERT INTO notifications (user_id, title, message, category, related_table, related_id)
//            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
//           [1, template_title, template_message, rule.category, related_table, relatedId] // user_id=1 ตัวอย่าง
//         );

//         // insert log
//         await pool.query(
//           `INSERT INTO notification_log (rule_id, related_table, related_id, sent_at)
//            VALUES ($1, $2, $3, NOW())`,
//           [rule_id, related_table, relatedId]
//         );

//         // realtime push ไป frontend
//         getIO().to(`user_${1}`).emit("newNotification", notiRes.rows[0]);
//       }
//     }
//   }
// }

// module.exports = { checkNotificationRules };
