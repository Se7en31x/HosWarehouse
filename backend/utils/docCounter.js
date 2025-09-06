// utils/docCounter.js
const { pool } = require("../config/db");

function getPrefix(docType) {
  switch (docType) {
    case "request": return "REQ";
    case "purchase_request": return "PR";
    case "purchase_order": return "PO";
    case "rfq": return "RFQ";
    case "goods_receipt": return "GR";
    default: return "DOC";
  }
}

async function generateDocNo(client, docType) {
  const prefix = getPrefix(docType);
  const year = new Date().getFullYear();
  const counterDate = `${year}-01-01`; // ✅ ใช้วันที่เริ่มต้นปีเดียวพอ

  const { rows } = await client.query(
    `INSERT INTO doc_counter (counter_date, doc_type, last_seq)
     VALUES ($1, $2, 1)
     ON CONFLICT (counter_date, doc_type)
     DO UPDATE SET last_seq = doc_counter.last_seq + 1
     RETURNING last_seq`,
    [counterDate, docType]
  );

  const seq = rows[0].last_seq;
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}

module.exports = { generateDocNo };
