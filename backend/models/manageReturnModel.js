// models/manageReturnModel.js
const { pool } = require('../config/db');

/**
 * จัดการคำขอยืมและรับคืนพัสดุ
 * - getBorrowQueue: หน้าแสดงรายการคำขอยืมที่รอรับคืน (ของถึงมือแล้ว + ยังค้างคืน)
 * - getManageReturnDetail: รายละเอียดคำขอ
 * - receiveReturn: บันทึกรับคืน (อนุญาตเฉพาะรายการที่ของถึงมือแล้ว)
 */
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
            rd.request_detail_type
          FROM request_details rd
          JOIN items i ON i.item_id = rd.item_id
          WHERE rd.request_id = $1
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
          b.request_detail_type
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

  async receiveReturn({ request_detail_id, return_qty, condition, note, inspected_by }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const rdRes = await client.query(
        `SELECT
         rd.request_id,
         rd.item_id,
         COALESCE(rd.actual_deducted_qty, rd.approved_qty, 0)::int AS delivered_qty,
         rd.request_detail_type,
         rd.processing_status
       FROM request_details rd
       WHERE rd.request_detail_id = $1
         AND rd.request_detail_type = 'borrow'
         AND rd.processing_status = 'completed'
         AND COALESCE(rd.actual_deducted_qty, rd.approved_qty, 0) > 0
       FOR UPDATE;`,
        [request_detail_id]
      );

      if (!rdRes.rowCount) {
        throw new Error('request_detail_id not found or invalid');
      }

      const rd = rdRes.rows[0];
      const baseline_qty = Number(rd.delivered_qty);
      const item_id = Number(rd.item_id);

      const retSumRes = await client.query(
        `SELECT COALESCE(SUM(return_qty),0)::int AS total
       FROM borrow_returns
       WHERE request_detail_id = $1
         AND return_status IN ('received','accepted','completed');`,
        [request_detail_id]
      );
      const returned_total = Number(retSumRes.rows[0]?.total || 0);

      const remaining_qty = baseline_qty - returned_total;
      if (remaining_qty <= 0) {
        throw new Error('NO_REMAINING_TO_RETURN');
      }

      const qty = Number(return_qty || 0);
      if (!Number.isFinite(qty) || qty <= 0 || qty > remaining_qty) {
        throw new Error('Invalid return_qty: Cannot be less than 1 or more than remaining quantity');
      }

      const cond = String(condition || 'normal').toLowerCase();
      const return_status =
        cond === 'lost' ? 'accepted'
          : cond === 'damaged' ? 'accepted'
            : 'received';

      // 1) บันทึกลง borrow_returns
      const brRes = await client.query(
        `INSERT INTO borrow_returns
      (request_detail_id, return_date, return_qty, return_status, inspected_by, return_note, condition)
      VALUES ($1, NOW(), $2, $3, $4, $5::text, $6)
      RETURNING return_id;`,
        [request_detail_id, qty, return_status, inspected_by || null, note ?? null, cond]
      );
      const return_id = brRes.rows[0].return_id;

      // 2) ถ้าเป็น damaged หรือ lost → insert ลง damaged_items
      if (cond === 'damaged' || cond === 'lost') {
        await client.query(`
        INSERT INTO damaged_items (
        item_id, source_type, source_ref_id, damaged_qty, damaged_date,
        damaged_status, damaged_note, reported_by, damage_type
        )
        VALUES ($1, 'borrow_return', $2, $3, NOW(), 'pending', $4, $5, $6)
        `, [
          item_id,
          return_id,
          qty,
          note ?? null,
          inspected_by || null,
          cond // ✅ บันทึกเป็น damaged_type = 'damaged' หรือ 'lost'
        ]);
      }
      // 3) gen move_code
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}${mm}${dd}`;
      const seqRes = await client.query(
        `INSERT INTO stock_move_counter (counter_date, last_seq)
         VALUES ($1::date, 1)
         ON CONFLICT (counter_date)
         DO UPDATE SET last_seq = stock_move_counter.last_seq + 1
       RETURNING last_seq;`,
        [`${yyyy}-${mm}-${dd}`]
      );
      const seq = String(seqRes.rows[0].last_seq).padStart(4, '0');
      const move_code = `MOV-${dateStr}-${seq}`;

      const move_type =
        cond === 'lost' ? 'return_lost'
          : cond === 'damaged' ? 'return_damaged'
            : 'return_in';

      // 4) insert stock_movements
      await client.query(
        `INSERT INTO stock_movements
         (item_id, move_type, move_qty, move_date, move_status, user_id, note, move_code)
       VALUES
         ($1, $2, $3, NOW(), 'completed', $4,
          'ref=RET-' || ($5::int)::text ||
          '; request_detail_id=' || ($6::int)::text ||
          '; condition=' || ($7::text) ||
          '; ' || COALESCE($8::text, ''),
          $9);`,
        [item_id, move_type, qty, inspected_by || null, return_id, request_detail_id, cond, note ?? null, move_code]
      );

      // 5) ถ้าคืนปกติ → เพิ่มกลับสต็อก
      if (cond === 'normal') {
        await client.query(
          `UPDATE items
           SET item_qty = COALESCE(item_qty,0) + $1,
               item_update = NOW()
         WHERE item_id = $2;`,
          [qty, item_id]
        );
      }

      // 6) อัปเดตสถานะ request_detail ถ้าคืนครบ
      const newReturned = returned_total + qty;
      const remainingAfter = baseline_qty - newReturned;
      if (remainingAfter <= 0) {
        await client.query(
          `UPDATE request_details
           SET processing_status = 'returned',
               updated_at = NOW()
         WHERE request_detail_id = $1;`,
          [request_detail_id]
        );
      }

      // 7) เก็บประวัติการเปลี่ยนแปลง
      await client.query(
        `INSERT INTO request_status_history
         (request_id, request_detail_id, changed_by, changed_at, history_type,
          old_value_type, old_value, new_value, note)
       VALUES
         ($1, $2, $3, NOW(), 'return',
          'remaining_qty', NULL, NULL,
          'รับคืน=' || ($4::int)::text ||
          '; remaining_after=' || ($5::int)::text ||
          '; condition=' || ($6::text) ||
          '; ' || COALESCE($7::text, ''));`,
        [rd.request_id, request_detail_id, inspected_by || null, qty, remainingAfter, cond, note ?? null]
      );

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Return received',
        data: {
          request_detail_id,
          return_id,
          move_code,
          returned_total: newReturned,
          remaining_qty: remainingAfter
        }
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },
};

module.exports = ManageReturnModel;
