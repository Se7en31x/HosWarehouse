// utils/docCounter.js
const { pool } = require("../config/db");

// เลือก prefix ตามประเภทเอกสาร
function getPrefix(docType) {
  switch (docType) {
    case "purchase_request": return "PR";
    case "purchase_order": return "PO";
    case "rfq": return "RFQ"; // ✅ เพิ่ม
    default: return "DOC";
  }
}

// ฟังก์ชัน gen เลขเอกสาร
async function generateDocNo(client, docType) {
  const prefix = getPrefix(docType);

  const { rows } = await client.query(
    `SELECT last_seq FROM doc_counter
     WHERE counter_date = CURRENT_DATE AND doc_type = $1`,
    [docType]
  );

  let nextSeq;
  if (rows.length > 0) {
    nextSeq = rows[0].last_seq + 1;
    await client.query(
      `UPDATE doc_counter SET last_seq = $1
       WHERE counter_date = CURRENT_DATE AND doc_type = $2`,
      [nextSeq, docType]
    );
  } else {
    nextSeq = 1;
    await client.query(
      `INSERT INTO doc_counter (counter_date, doc_type, last_seq)
       VALUES (CURRENT_DATE, $1, 1)`,
      [docType]
    );
  }

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");

  return `${prefix}-${year}-${month}-${String(nextSeq).padStart(3, "0")}`;
}

module.exports = { generateDocNo };
