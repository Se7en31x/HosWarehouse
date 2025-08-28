// models/rfqModel.js
const { pool } = require("../config/db");
const { generateDocNo } = require("../utils/docCounter");

async function createRFQ({ created_by, items }) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // ✅ ใช้ docCounter แทน Date.now()
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

            // ✅ อัปเดตสถานะ PR ที่ถูกอ้างถึง
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

async function getRFQById(rfq_id) {
    const { rows: header } = await pool.query(
        `SELECT rfq.*, u.user_fname, u.user_lname
     FROM request_for_quotations rfq
     LEFT JOIN users u ON rfq.created_by = u.user_id
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
async function getAllRFQs() {
    const { rows } = await pool.query(
        `SELECT 
        rfq.*,
        u.user_fname,
        u.user_lname,
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
     LEFT JOIN users u ON rfq.created_by = u.user_id
     LEFT JOIN rfq_items ri ON rfq.rfq_id = ri.rfq_id
     LEFT JOIN purchase_requests pr ON ri.pr_id = pr.pr_id
     LEFT JOIN purchase_request_items pri ON ri.pr_item_id = pri.pr_item_id
     LEFT JOIN items i ON pri.item_id = i.item_id
     GROUP BY rfq.rfq_id, u.user_fname, u.user_lname
     ORDER BY rfq.created_at DESC`
    );
    return rows;
}

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
      WHERE r.status = 'รอดำเนินการ'   -- ✅ string ชัดเจน
      GROUP BY r.rfq_id
      ORDER BY r.created_at DESC
    `);
    return rows;
  } catch (err) {
    console.error("❌ getPendingRFQs error:", err.message);
    throw new Error(`Failed to fetch pending RFQs: ${err.message}`);
  }
}

module.exports = { createRFQ, getAllRFQs, getRFQById ,getPendingRFQs};
