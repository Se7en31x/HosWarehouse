// models/manageReturnModel.js
const { pool } = require('../config/db');
const { generateImportNo } = require('../utils/docCounter');

/**
 * จัดการคำขอยืมและรับคืนพัสดุ
 * - getBorrowQueue: หน้าแสดงรายการคำขอยืมที่รอรับคืน (ของถึงมือแล้ว + ยังค้างคืน)
 * - getManageReturnDetail: รายละเอียดคำขอ
 * - receiveReturn: บันทึกรับคืน (อนุญาตเฉพาะรายการที่ของถึงมือแล้ว)
 */

async function generateMoveBatchCode(client) {
  const today = new Date().toISOString().slice(0, 10);
  const { rows } = await client.query(
    `INSERT INTO stock_move_counter (counter_date, last_seq)
     VALUES ($1, 1)
     ON CONFLICT (counter_date) DO UPDATE
       SET last_seq = stock_move_counter.last_seq + 1
     RETURNING last_seq`,
    [today]
  );

  const seq = rows[0].last_seq.toString().padStart(4, '0');
  return `MOVE-${today.replace(/-/g, '')}-${seq}`;
}

const ManageReturnModel = {
  /**
   * คิวรับคืน:
   * - request_type = 'borrow'
   * - rd.processing_status = 'completed'  (ของถึงมือแล้ว)
   * - remaining > 0 (ยังค้างคืน)
   */
  async getBorrowQueue({ q, status, page, limit }) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.max(1, Math.min(100, Number(limit) || 12));
    const offset = (p - 1) * l;

    const params = [];
    let idx = 1;

    const baseQuery = `
      FROM requests r
      JOIN users u ON u.user_id = r.user_id
      JOIN request_details rd ON rd.request_id = r.request_id
      LEFT JOIN (
        SELECT request_detail_id, COALESCE(SUM(return_qty), 0)::int AS returned_total
        FROM borrow_returns
        WHERE return_status IN ('received','accepted','completed')
        GROUP BY request_detail_id
      ) AS br ON br.request_detail_id = rd.request_detail_id
    `;

    let where = `
      WHERE LOWER(COALESCE(r.request_type,'')) = 'borrow'
      AND rd.processing_status = 'completed'
      AND COALESCE(rd.actual_deducted_qty, rd.approved_qty, 0) > 0
      AND GREATEST(COALESCE(rd.actual_deducted_qty, rd.approved_qty, 0) - COALESCE(br.returned_total, 0), 0) > 0
    `;

    if (q) {
      params.push(`%${String(q).toLowerCase()}%`);
      where += `
        AND (
          LOWER(COALESCE(r.request_code,'')) LIKE $${idx}
          OR LOWER(COALESCE(u.user_fname,'') || ' ' || COALESCE(u.user_lname,'')) LIKE $${idx}
          OR EXISTS (
            SELECT 1
            FROM request_details rd2
            JOIN items it2 ON it2.item_id = rd2.item_id
            WHERE rd2.request_id = r.request_id
              AND LOWER(COALESCE(it2.item_name,'')) LIKE $${idx}
          )
        )
      `;
      idx++;
    }

    if (status === 'overdue') {
      where += ` AND rd.expected_return_date < CURRENT_DATE`;
    } else if (status === 'due_soon') {
      where += ` AND rd.expected_return_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'`;
    }

    const countSql = `
      SELECT COUNT(DISTINCT r.request_id)::int AS cnt
      ${baseQuery}
      ${where};
    `;
    const countRes = await pool.query(countSql, params);
    const totalCount = Number(countRes.rows[0]?.cnt || 0);
    const totalPages = Math.max(1, Math.ceil(totalCount / l));

    const dataSql = `
  SELECT
    r.request_id,
    r.request_code,
    (COALESCE(u.user_fname,'') || ' ' || COALESCE(u.user_lname,'')) AS requester_name,
    u.department,
    MIN(rd.expected_return_date) FILTER (
      WHERE GREATEST(COALESCE(rd.actual_deducted_qty, rd.approved_qty, 0) - COALESCE(br.returned_total, 0), 0) > 0
    ) AS earliest_due_date,
    SUM(
      CASE WHEN GREATEST(COALESCE(rd.actual_deducted_qty, rd.approved_qty, 0) - COALESCE(br.returned_total, 0), 0) > 0
            AND rd.expected_return_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
           THEN 1 ELSE 0 END
    ) AS items_due_soon,
    SUM(
      CASE WHEN GREATEST(COALESCE(rd.actual_deducted_qty, rd.approved_qty, 0) - COALESCE(br.returned_total, 0), 0) > 0
            AND rd.expected_return_date < CURRENT_DATE
           THEN 1 ELSE 0 END
    ) AS items_overdue,

    -- ✅ จำนวนวันเกินกำหนดมากที่สุด
    MAX(
      GREATEST((CURRENT_DATE - rd.expected_return_date), 0)
    ) FILTER (
      WHERE GREATEST(COALESCE(rd.actual_deducted_qty, rd.approved_qty, 0) - COALESCE(br.returned_total, 0), 0) > 0
    )::int AS max_days_overdue,

    CASE
      WHEN SUM(
        CASE WHEN GREATEST(COALESCE(rd.actual_deducted_qty, rd.approved_qty, 0) - COALESCE(br.returned_total, 0), 0) > 0
              AND rd.expected_return_date < CURRENT_DATE
             THEN 1 ELSE 0 END
      ) > 0 THEN 'overdue'
      WHEN SUM(
        CASE WHEN GREATEST(COALESCE(rd.actual_deducted_qty, rd.approved_qty, 0) - COALESCE(br.returned_total, 0), 0) > 0
              AND rd.expected_return_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
             THEN 1 ELSE 0 END
      ) > 0 THEN 'due_soon'
      ELSE 'borrowed'
    END AS overall_status
  ${baseQuery}
  ${where}
  GROUP BY r.request_id, r.request_code, requester_name, u.department
  ORDER BY earliest_due_date NULLS LAST, r.request_id
  OFFSET $${idx++} LIMIT $${idx++};
`;

    const dataRes = await pool.query(dataSql, [...params, offset, l]);

    return { rows: dataRes.rows, totalCount, totalPages, currentPage: p };
  },

  /**
   * รายละเอียดคำขอ (โชว์ทุกบรรทัด; ฝั่ง UI จะฟิลเตอร์ “ยังค้างคืน” ได้)
   */
  async getManageReturnDetail(requestId) {
    const client = await pool.connect();
    try {
      const sumSql = `
        SELECT
          r.request_id, r.request_code, r.request_date, r.request_type,
          (COALESCE(u.user_fname,'') || ' ' || COALESCE(u.user_lname,'')) AS user_name,
          u.department
        FROM requests r
        LEFT JOIN users u ON u.user_id = r.user_id
        WHERE r.request_id = $1
        LIMIT 1;
      `;
      const sumRes = await client.query(sumSql, [requestId]);
      if (!sumRes.rowCount) return { summary: null, lineItems: [], returnHistory: [] };
      const summary = sumRes.rows[0];

      const itemsSql = `
  WITH base AS (
    SELECT
      rd.request_detail_id,
      rd.item_id,
      i.item_name,
      i.item_unit,
      rd.request_id,
      COALESCE(rd.approved_qty,0)::int AS approved_qty,
      COALESCE(rd.actual_deducted_qty, rd.approved_qty, 0)::int AS delivered_qty,
      rd.expected_return_date,
      rd.processing_status,
      rd.request_detail_type,
      rd.borrow_status              -- ✅ ดึง borrow_status มาด้วย
    FROM request_details rd
    JOIN items i ON i.item_id = rd.item_id
    WHERE rd.request_id = $1
      AND rd.borrow_status = 'borrowed'  -- ✅ กรองเฉพาะที่ส่งมอบแล้ว
  ),
  ret AS (
    SELECT request_detail_id, COALESCE(SUM(return_qty),0)::int AS returned_total
    FROM borrow_returns
    WHERE request_detail_id IN (SELECT request_detail_id FROM base)
      AND return_status IN ('received','accepted','completed')
    GROUP BY request_detail_id
  )
  SELECT
    b.request_detail_id,
    b.item_id,
    b.item_name,
    b.item_unit,
    b.approved_qty,
    b.delivered_qty AS baseline_qty,
    COALESCE(r.returned_total,0)::int AS returned_total,
    GREATEST(b.delivered_qty - COALESCE(r.returned_total,0),0)::int AS remaining_qty,
    b.expected_return_date,
    b.processing_status,
    b.request_detail_type,
    b.borrow_status   -- ✅ ส่งไปให้ frontend ด้วย
  FROM base b
  LEFT JOIN ret r ON r.request_detail_id = b.request_detail_id
  ORDER BY b.request_detail_id;
`;
      const itemsRes = await client.query(itemsSql, [requestId]);

      const historySql = `
        WITH h AS (
          SELECT
            br.return_id,
            br.request_detail_id,
            br.return_date,
            br.return_qty,
            br.return_status,
            br.condition, -- ✅ เพิ่มการดึง condition
            (COALESCE(u.user_fname,'') || ' ' || COALESCE(u.user_lname,'')) AS inspected_by_name
          FROM borrow_returns br
          LEFT JOIN users u ON u.user_id = br.inspected_by
          WHERE br.request_detail_id IN (SELECT request_detail_id FROM request_details WHERE request_id = $1)
        ),
        a AS (
          SELECT
            h.*,
            SUM(h.return_qty) OVER (PARTITION BY h.request_detail_id ORDER BY h.return_date, h.return_id) AS returned_total
          FROM h
        )
        SELECT
          'RET-' || a.return_id AS return_code,
          a.return_id,
          a.request_detail_id,
          a.return_date,
          a.return_qty AS returned_this_time,
          a.return_status,
          a.condition, -- ✅ ใช้ condition จาก h
          a.inspected_by_name,
          a.returned_total
        FROM a
        ORDER BY a.return_date DESC, a.return_id DESC;
      `;
      const histRes = await client.query(historySql, [requestId]);

      return { summary, lineItems: itemsRes.rows, returnHistory: histRes.rows };
    } finally {
      client.release();
    }
  },

  // 🟢 รับคืนของ
  async receiveReturn(returnData, userId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const requestDetailId = parseInt(returnData.request_detail_id, 10);
      const qty = parseInt(returnData.return_qty ?? returnData.qty_return, 10);
      const inspectedBy = parseInt(returnData.inspected_by ?? userId, 10);
      const condition = (returnData.condition || 'normal').toLowerCase();

      if (!Number.isInteger(requestDetailId) || requestDetailId <= 0)
        throw new Error("Invalid request_detail_id");
      if (!Number.isInteger(qty) || qty <= 0)
        throw new Error("Invalid qty_return: ต้องเป็นจำนวนเต็มบวก");
      if (!Number.isInteger(inspectedBy) || inspectedBy <= 0)
        throw new Error("Invalid userId");

      // insert header
      const { rows: [header] } = await client.query(
        `INSERT INTO borrow_returns
        (request_detail_id, return_date, return_qty, return_status, inspected_by, return_note, condition)
       VALUES ($1, NOW(), $2, 'completed', $3, $4, $5)
       RETURNING return_id`,
        [requestDetailId, qty, inspectedBy, returnData.note || null, condition]
      );
      const returnId = header.return_id;

      // ดึง lots ที่เหลือให้คืน
      let qtyLeft = qty;
      const { rows: borrowLots } = await client.query(
        `SELECT bdl.borrow_detail_lot_id, bdl.lot_id, bdl.qty,
              COALESCE(SUM(brl.qty),0) AS returned_qty,
              (bdl.qty - COALESCE(SUM(brl.qty),0)) AS remaining_to_return
       FROM borrow_detail_lots bdl
       LEFT JOIN borrow_return_lots brl 
         ON brl.borrow_detail_lot_id = bdl.borrow_detail_lot_id
       WHERE bdl.request_detail_id = $1
       GROUP BY bdl.borrow_detail_lot_id, bdl.lot_id, bdl.qty
       HAVING (bdl.qty - COALESCE(SUM(brl.qty),0)) > 0
       ORDER BY bdl.borrow_detail_lot_id`,
        [requestDetailId]
      );

      if (borrowLots.length === 0) {
        throw new Error("ไม่มี lot ที่เหลือให้คืน");
      }

      let status = condition;

      for (const lot of borrowLots) {
        if (qtyLeft <= 0) break;
        const useQty = Math.min(lot.remaining_to_return, qtyLeft);
        qtyLeft -= useQty;

        // insert mapping return lot
        await client.query(
          `INSERT INTO borrow_return_lots
          (return_id, borrow_detail_lot_id, lot_id, qty)
         VALUES ($1,$2,$3,$4)`,
          [returnId, lot.borrow_detail_lot_id, lot.lot_id, useQty]
        );

        // ดึงข้อมูล lot
        const { rows: [lotInfo] } = await client.query(
          `SELECT item_id FROM item_lots WHERE lot_id=$1`,
          [lot.lot_id]
        );

        if (condition === 'normal') {
          // ✅ คืนเข้าคลัง
          await client.query(
            `UPDATE item_lots
           SET qty_remaining = qty_remaining + $1, updated_at = NOW()
           WHERE lot_id = $2`,
            [useQty, lot.lot_id]
          );

          await client.query(
            `INSERT INTO stock_movements
            (item_id, lot_id, move_type, move_qty, move_date, move_status, user_id, note, move_code)
           VALUES ($1,$2,'return',$3,NOW(),'completed',$4,$5,$6)`,
            [
              lotInfo.item_id, lot.lot_id, useQty, inspectedBy,
              `คืนของปกติ return_id=${returnId}`,
              await generateMoveBatchCode(client)
            ]
          );

          // import log
          const import_no = await generateImportNo(client, 'return');
          const { rows: [importRow] } = await client.query(
            `INSERT INTO imports (
              import_date, user_id, import_status, import_type, source_name, source_type, source_ref_id, import_no
           ) VALUES (
              NOW(), $1, 'posted', 'return', 'คืนจากการยืม', 'borrow_return', $2, $3
           )
           RETURNING import_id`,
            [inspectedBy, returnId, import_no]
          );

          await client.query(
            `INSERT INTO import_details (import_id, item_id, quantity, import_note)
           VALUES ($1,$2,$3,'คืนจากการยืม')`,
            [importRow.import_id, lotInfo.item_id, useQty]
          );

        } else if (condition === 'damaged' || condition === 'lost') {
          // ❌ ชำรุด/สูญหาย
          await client.query(
            `INSERT INTO damaged_items
            (source_type, source_ref_id, damaged_qty, damaged_date, damaged_status, damaged_note, reported_by, lot_id, item_id, damage_type)
           VALUES ('borrow_return',$1,$2,NOW(),'waiting',$3,$4,$5,$6,$7)`,
            [returnId, useQty, returnData.note || null, inspectedBy, lot.lot_id, lotInfo.item_id, condition]
          );

          await client.query(
            `INSERT INTO stock_movements
            (item_id, lot_id, move_type, move_qty, move_date, move_status, user_id, note, move_code)
           VALUES ($1,$2,$3,$4,NOW(),'completed',$5,$6,$7)`,
            [
              lotInfo.item_id, lot.lot_id, condition, useQty, inspectedBy,
              `คืนของสภาพ=${condition} return_id=${returnId}`,
              await generateMoveBatchCode(client)
            ]
          );
        }
      }

      if (qtyLeft > 0) {
        throw new Error("Invalid return_qty: มากกว่าจำนวนที่เหลือให้คืน");
      }

      // check คืนครบหรือยัง
      const { rows: [check] } = await client.query(
        `SELECT 
          (SELECT COALESCE(SUM(qty),0) 
           FROM borrow_detail_lots 
           WHERE request_detail_id=$1) AS borrowed_qty,
          (SELECT COALESCE(SUM(brl.qty),0)
           FROM borrow_return_lots brl
           JOIN borrow_returns br ON br.return_id = brl.return_id
           WHERE br.request_detail_id=$1) AS returned_qty`,
        [requestDetailId]
      );

      if (check.returned_qty >= check.borrowed_qty) {
        await client.query(
          `UPDATE request_details
           SET borrow_status = 'returned', updated_at = NOW()
         WHERE request_detail_id = $1`,
          [requestDetailId]
        );
      }

      await client.query("COMMIT");
      return { success: true, returnId, status };

    } catch (err) {
      await client.query("ROLLBACK");
      console.error("❌ receiveReturn error:", err);
      throw err;
    } finally {
      client.release();
    }
  }
};
module.exports = ManageReturnModel;