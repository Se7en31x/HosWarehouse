// backend/utils/stockinCounter.js
async function generateStockinCode(client) {
  const { rows: nowRows } = await client.query(`SELECT CURRENT_DATE::date AS d`);
  const d = nowRows[0].d;

  const y = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  // ✅ สร้างตาราง counter ถ้ายังไม่มี
  await client.query(`
    CREATE TABLE IF NOT EXISTS stockin_counter (
      counter_date date PRIMARY KEY,
      last_seq integer NOT NULL
    )
  `);

  // ✅ insert row ของวันใหม่ ถ้ายังไม่มี
  await client.query(
    `INSERT INTO stockin_counter(counter_date, last_seq)
     VALUES ($1, 0)
     ON CONFLICT (counter_date) DO NOTHING`,
    [d]
  );

  // ✅ update sequence ของวันนั้น
  const { rows } = await client.query(
    `UPDATE stockin_counter
     SET last_seq = last_seq + 1
     WHERE counter_date = $1
     RETURNING last_seq`,
    [d]
  );

  const seq = rows[0].last_seq;
  const seqStr = String(seq).padStart(4, "0");

  return `STI-${y}${mm}${dd}-${seqStr}`;
}

module.exports = { generateStockinCode };
