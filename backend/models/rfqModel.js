const { pool } = require("../config/db");
const { generateDocNo } = require("../utils/docCounter");

//
// ✅ สร้าง RFQ
//
async function createRFQ({ created_by, items }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // สร้างเลขที่ RFQ
    const rfqNo = await generateDocNo(client, "rfq");

    const { rows } = await client.query(
      `INSERT INTO request_for_quotations (rfq_no, created_by, created_at, status)
       VALUES ($1, $2, NOW(), 'รอดำเนินการ')
       RETURNING rfq_id, rfq_no`,
      [rfqNo, created_by]
    );

    const rfq_id = rows[0].rfq_id;

    for (const item of items) {
      await client.query(
        `INSERT INTO rfq_items (rfq_id, pr_id, pr_item_id, spec, qty, unit)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [rfq_id, item.pr_id, item.pr_item_id, item.spec, item.qty, item.unit]
      );

      // อัปเดตสถานะ PR
      await client.query(
        `UPDATE purchase_requests 
         SET status = 'กำลังดำเนินการ', updated_at = NOW()
         WHERE pr_id = $1`,
        [item.pr_id]
      );
    }

    await client.query("COMMIT");
    return { rfq_id, rfq_no: rfqNo };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

//
// ✅ ดึง RFQ ตาม ID
//
async function getRFQById(rfq_id) {
  const { rows: header } = await pool.query(
    `SELECT rfq.*, u.firstname, u.lastname
     FROM request_for_quotations rfq
     LEFT JOIN "Admin".users u ON rfq.created_by = u.user_id
     WHERE rfq.rfq_id = $1`,
    [rfq_id]
  );

  const { rows: items } = await pool.query(
    `SELECT 
        ri.rfq_item_id,
        ri.pr_id,
        ri.pr_item_id,
        ri.qty,
        ri.unit,
        ri.spec,
        pr.pr_no,
        i.item_name
     FROM rfq_items ri
     LEFT JOIN purchase_requests pr ON ri.pr_id = pr.pr_id
     LEFT JOIN purchase_request_items pri ON ri.pr_item_id = pri.pr_item_id
     LEFT JOIN items i ON pri.item_id = i.item_id
     WHERE ri.rfq_id = $1`,
    [rfq_id]
  );

  return { header: header[0], items };
}

//
// ✅ ดึง RFQ ทั้งหมด
//
async function getAllRFQs() {
  const { rows } = await pool.query(
    `SELECT 
        rfq.*,
        u.firstname,
        u.lastname,
        COALESCE(
          json_agg(
            json_build_object(
              'rfq_item_id', ri.rfq_item_id,
              'pr_no', pr.pr_no,
              'item_name', i.item_name,
              'qty', ri.qty,
              'unit', ri.unit,
              'spec', ri.spec
            )
          ) FILTER (WHERE ri.rfq_item_id IS NOT NULL), '[]'
        ) AS items
     FROM request_for_quotations rfq
     LEFT JOIN "Admin".users u ON rfq.created_by = u.user_id
     LEFT JOIN rfq_items ri ON rfq.rfq_id = ri.rfq_id
     LEFT JOIN purchase_requests pr ON ri.pr_id = pr.pr_id
     LEFT JOIN purchase_request_items pri ON ri.pr_item_id = pri.pr_item_id
     LEFT JOIN items i ON pri.item_id = i.item_id
     GROUP BY rfq.rfq_id, u.firstname, u.lastname
     ORDER BY rfq.created_at DESC`
  );
  return rows;
}

//
// ✅ ดึง RFQ ที่ Pending (ยังไม่ได้สร้าง PO)
//
async function getPendingRFQs() {
  try {
    const { rows } = await pool.query(`
      SELECT 
        r.rfq_id,
        r.rfq_no,
        r.status,
        r.created_at,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'rfq_item_id', ri.rfq_item_id,
              'pr_id', ri.pr_id,
              'pr_item_id', ri.pr_item_id,
              'spec', ri.spec,
              'qty', ri.qty,
              'unit', ri.unit
            )
          ) FILTER (WHERE ri.rfq_item_id IS NOT NULL), '[]'
        ) AS items
      FROM request_for_quotations r
      LEFT JOIN rfq_items ri ON r.rfq_id = ri.rfq_id
      WHERE r.status = 'รอดำเนินการ'
        AND NOT EXISTS (
          SELECT 1 FROM purchase_orders po WHERE po.rfq_id = r.rfq_id
        )
      GROUP BY r.rfq_id
      ORDER BY r.created_at DESC
    `);
    return rows;
  } catch (err) {
    console.error("❌ getPendingRFQs error:", err.message);
    throw new Error(`Failed to fetch pending RFQs: ${err.message}`);
  }
}

//
// ✅ Report RFQ
//
async function getRFQReport() {
  try {
    const { rows } = await pool.query(`
      SELECT 
        r.rfq_id,
        r.rfq_no,
        r.status,
        r.created_at,
        u.firstname,
        u.lastname,
        CAST(COUNT(ri.rfq_item_id) AS INT) AS item_count,
        CAST(COALESCE(SUM(ri.qty), 0) AS INT) AS total_qty
      FROM request_for_quotations r
      LEFT JOIN rfq_items ri ON r.rfq_id = ri.rfq_id
      LEFT JOIN "Admin".users u ON r.created_by = u.user_id   -- ✅ ใช้ schema Admin
      GROUP BY r.rfq_id, r.rfq_no, r.status, r.created_at, u.firstname, u.lastname
      ORDER BY r.created_at DESC
    `);
    return rows;
  } catch (err) {
    console.error("❌ getRFQReport SQL error:", err);
    throw err;
  }
}


//
// ✅ Export ฟังก์ชันทั้งหมด
//
module.exports = { 
  createRFQ, 
  getAllRFQs, 
  getRFQById,
  getPendingRFQs,
  getRFQReport
};
