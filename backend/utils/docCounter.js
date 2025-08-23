//utils/docCounter.js

const { pool } = require('../config/db');

// แปลง importType เป็น prefix
function getPrefix(importType) {
    switch (importType) {
        case "purchase": return "PUR";
        case "general": return "GEN";
        case "return": return "RET";
        case "repair_return": return "RR";
        case "adjustment": return "ADJ";
        default: return "IMP";
    }
}

// ฟังก์ชันหลักสำหรับ gen เลขเอกสาร
async function generateImportNo(client, importType) {
    const prefix = getPrefix(importType);

    // หาเลขล่าสุดของวันนั้น
    const { rows } = await client.query(
        `SELECT last_seq FROM doc_counter 
     WHERE counter_date = CURRENT_DATE AND doc_type = $1`,
        [importType]
    );

    let nextSeq;
    if (rows.length > 0) {
        nextSeq = rows[0].last_seq + 1;
        await client.query(
            `UPDATE doc_counter SET last_seq = $1 
       WHERE counter_date = CURRENT_DATE AND doc_type = $2`,
            [nextSeq, importType]
        );
    } else {
        nextSeq = 1;
        await client.query(
            `INSERT INTO doc_counter (counter_date, doc_type, last_seq) 
       VALUES (CURRENT_DATE, $1, 1)`,
            [importType]
        );
    }

    // gen เลขเอกสาร เช่น RR-2025-08-001
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");

    return `${prefix}-${year}-${month}-${String(nextSeq).padStart(3, "0")}`;
}

module.exports = { generateImportNo };

