// cronJobs.js
const cron = require('node-cron');
const { pool } = require('./config/db');

// รันทุกวันตอน 00:05
cron.schedule('5 0 * * *', async () => {
  console.log('⏳ Running cron job: check expired lots...');
  try {
    const result = await pool.query(`
      UPDATE item_lots
      SET is_expired = true
      WHERE expiry_date < CURRENT_DATE
      AND is_expired = false
      RETURNING lot_id, expiry_date;
    `);

    if (result.rowCount > 0) {
      console.log(`✅ Updated ${result.rowCount} expired lots`, result.rows);
    } else {
      console.log('ℹ️ No expired lots today');
    }
  } catch (err) {
    console.error('❌ Error updating expired lots:', err.message);
  }
});
