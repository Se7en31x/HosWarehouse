// utils/returnCounter.js
async function generateReturnCode(client) {
  // วันที่ปัจจุบัน
  const today = new Date();
  const ymd = today.toISOString().slice(0, 10).replace(/-/g, ""); // 20250829
  const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD

  // 🔒 lock row ของวันนั้น ๆ
  const { rows } = await client.query(
    `INSERT INTO return_counter (counter_date, last_seq)
     VALUES ($1, 1)
     ON CONFLICT (counter_date)
     DO UPDATE SET last_seq = return_counter.last_seq + 1
     RETURNING last_seq`,
    [todayStr]
  );

  const seq = String(rows[0].last_seq).padStart(4, "0"); // ####
  return `RTN-${ymd}-${seq}`;
}

module.exports = { generateReturnCode };
