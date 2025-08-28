// utils/docCounter.js
const { pool } = require("../config/db");

function getPrefix(docType) {
  switch (docType) {
    case "purchase_request": return "PR";
    case "purchase_order": return "PO";
    case "rfq": return "RFQ";
    case "goods_receipt": return "GR";
    default: return "DOC";
  }
}

async function generateDocNo(client, docType) {
  const prefix = getPrefix(docType);

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");

  // ใช้ key เป็น เดือน (ไม่ reset ทุกวัน แต่ reset ทุกเดือน)
  const counterKey = `${year}-${month}-01`; // วันที่ fix เป็นวันแรกของเดือน

  // ✅ lock row กันชนกัน
  const { rows } = await client.query(
    `SELECT last_seq FROM doc_counter
     WHERE counter_date = $1 AND doc_type = $2
     FOR UPDATE`,
    [counterKey, docType]
  );

  let nextSeq;
  if (rows.length > 0) {
    nextSeq = rows[0].last_seq + 1;
    await client.query(
      `UPDATE doc_counter SET last_seq = $1
       WHERE counter_date = $2 AND doc_type = $3`,
      [nextSeq, counterKey, docType]
    );
  } else {
    nextSeq = 1;
    await client.query(
      `INSERT INTO doc_counter (counter_date, doc_type, last_seq)
       VALUES ($1, $2, 1)`,
      [counterKey, docType]
    );
  }

  // รูปแบบเลข: PR-2025-08-001
  return `${prefix}-${year}-${month}-${String(nextSeq).padStart(3, "0")}`;
}

module.exports = { generateDocNo };
