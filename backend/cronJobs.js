// cronJobs.js
const cron = require('node-cron');
const { pool } = require('./config/db');

// รันทุกวันตอน 00:05
cron.schedule('5 0 * * *', async () => {
  console.log('⏳ Running cron job: check expired lots...');
  try {
    const { rows } = await pool.query(`
      SELECT lot_id, qty_remaining, exp_date
      FROM item_lots
      WHERE exp_date < CURRENT_DATE
      AND is_expired = false
      AND qty_remaining > 0
    `);

    if (rows.length === 0) {
      console.log('ℹ️ No expired lots today');
      return;
    }

    for (const lot of rows) {
      // ✅ เก็บ log ไว้ใน expired_items
      await pool.query(
        `INSERT INTO expired_items (lot_id, expired_qty, disposed_qty, expired_date, reported_by, note)
         VALUES ($1, $2, 0, CURRENT_DATE, NULL, 'ระบบตรวจจับอัตโนมัติ')`,
        [lot.lot_id, lot.qty_remaining]
      );

      // ✅ mark lot ว่าหมดอายุ
      await pool.query(
        `UPDATE item_lots
         SET is_expired = true, qty_remaining = 0
         WHERE lot_id = $1`,
        [lot.lot_id]
      );

      console.log(`✅ Lot ${lot.lot_id} expired on ${lot.exp_date}, qty=${lot.qty_remaining}`);
    }
  } catch (err) {
    console.error('❌ Error updating expired lots:', err.message);
  }
});


//สำหรับทดสอบ
// cron.schedule('* * * * *', async () => {
//   console.log('⏳ Running cron job: check expired lots...');
//   try {
//     const { rows } = await pool.query(`
//       SELECT lot_id, qty_remaining, exp_date
//       FROM item_lots
//       WHERE exp_date < CURRENT_DATE
//       AND is_expired = false
//       AND qty_remaining > 0
//     `);

//     if (rows.length === 0) {
//       console.log('ℹ️ No expired lots today');
//       return;
//     }

//     for (const lot of rows) {
//       // ✅ เก็บ log ไว้ใน expired_items
//       await pool.query(
//         `INSERT INTO expired_items (lot_id, expired_qty, disposed_qty, expired_date, reported_by, note)
//          VALUES ($1, $2, 0, CURRENT_DATE, NULL, 'ระบบตรวจจับอัตโนมัติ')`,
//         [lot.lot_id, lot.qty_remaining]
//       );

//       // ✅ mark lot ว่าหมดอายุ
//       await pool.query(
//         `UPDATE item_lots
//          SET is_expired = true, qty_remaining = 0
//          WHERE lot_id = $1`,
//         [lot.lot_id]
//       );

//       console.log(`✅ Lot ${lot.lot_id} expired on ${lot.exp_date}, qty=${lot.qty_remaining}`);
//     }
//   } catch (err) {
//     console.error('❌ Error updating expired lots:', err.message);
//   }
// });

