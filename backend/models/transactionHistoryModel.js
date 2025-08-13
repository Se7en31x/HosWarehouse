const { pool } = require('../config/db');

const TransactionHistory = {
  async getAllFilteredLogs({ page, limit, type, search, sort_by, sort_order, group }) {
    let whereParams = [];
    let paramIndex = 1;

    const baseQuery = `
      WITH unified_logs AS (
        /* ---------- คำขอ: เหตุการณ์ระดับคำขอ (header) + สรุปรายการ ---------- */
        SELECT
          r.request_id                                  AS id,
          r.request_id                                  AS request_id,
          r.request_code                                AS reference_code,
          u.department                                  AS department_name,
          CASE
            WHEN rsh.history_type = 'request_creation' THEN 'CREATE_REQUEST'
            WHEN rsh.history_type = 'approval_overall_status_change' THEN 'APPROVAL'
            WHEN rsh.history_type = 'status_change' THEN 'PROCESSING'
            ELSE 'REQUEST_META'
          END::text                                     AS group_type,
          CASE
            WHEN rsh.history_type = 'request_creation' THEN 'สร้างคำขอ'
            WHEN rsh.history_type = 'approval_overall_status_change' THEN 'การอนุมัติคำขอ'
            WHEN rsh.history_type = 'status_change' THEN 'อัปเดตสถานะคำขอ'
            ELSE 'เหตุการณ์อื่น'
          END::text                                     AS event_type,
          COALESCE(rsh.note, 'สถานะ: ' || rsh.old_value || ' -> ' || rsh.new_value) AS detail,
          rsh.changed_at                                AS "timestamp",
          rsh.new_value                                 AS status,
          COALESCE(u.user_fname, '') || ' ' || COALESCE(u.user_lname, '') AS user_name,

          STRING_AGG(
            i.item_name || ' (' ||
              CASE
                WHEN LOWER(COALESCE(rd.request_detail_type, r.request_type)) IN ('borrow','ยืม') THEN 'ยืม'
                ELSE 'เบิก'
              END
            || ')',
            ', ' ORDER BY rd.request_detail_id
          )                                             AS items_summary,
          CASE
            WHEN LOWER(COALESCE(r.request_type, '')) IN ('borrow','ยืม') THEN 'ยืม'
            ELSE 'เบิก'
          END                                           AS request_mode_thai

        FROM requests r
        JOIN request_status_history rsh
          ON rsh.request_id = r.request_id
         AND rsh.request_detail_id IS NULL
        LEFT JOIN users u ON rsh.changed_by = u.user_id
        LEFT JOIN request_details rd ON rd.request_id = r.request_id
        LEFT JOIN items i ON i.item_id = rd.item_id
        WHERE rsh.history_type IN ('request_creation','approval_overall_status_change','status_change')
        GROUP BY
          r.request_id, r.request_code, u.department,
          rsh.history_type, rsh.note, rsh.old_value, rsh.new_value, rsh.changed_at,
          u.user_fname, u.user_lname, r.request_type

        UNION ALL

        /* ---------- คำขอ: เหตุการณ์ระดับรายการย่อย (detail) ---------- */
        SELECT
          rsh.history_id                                AS id,
          r.request_id                                  AS request_id,
          r.request_code                                AS reference_code,
          u.department                                  AS department_name,
          CASE
            WHEN rsh.history_type = 'approval_detail_status_change' THEN 'APPROVAL'
            WHEN rsh.history_type = 'processing_status_change' THEN 'PROCESSING'
            ELSE 'REQUEST_DETAIL'
          END::text                                     AS group_type,
          CASE
            WHEN rsh.history_type = 'approval_detail_status_change' THEN 'อนุมัติ/ปฏิเสธรายการย่อย'
            WHEN rsh.history_type = 'processing_status_change' THEN 'สถานะการดำเนินการ'
            ELSE 'รายละเอียด'
          END::text                                     AS event_type,
          COALESCE(
            rsh.note,
            'รายการ: ' || i.item_name || ' (สถานะ ' || rsh.old_value || ' -> ' || rsh.new_value || ')'
          )                                             AS detail,
          rsh.changed_at                                AS "timestamp",
          rsh.new_value                                 AS status,
          COALESCE(u.user_fname, '') || ' ' || COALESCE(u.user_lname, '') AS user_name,
          NULL::text                                    AS items_summary,
          NULL::text                                    AS request_mode_thai
        FROM requests r
        JOIN request_details rd ON rd.request_id = r.request_id
        JOIN request_status_history rsh ON rsh.request_detail_id = rd.request_detail_id
        LEFT JOIN items i ON i.item_id = rd.item_id
        LEFT JOIN users u ON rsh.changed_by = u.user_id
        WHERE rsh.history_type IN ('approval_detail_status_change','processing_status_change')

        UNION ALL

        /* ---------- นำเข้า ---------- */
        SELECT
          i.import_id                                   AS id,
          NULL::int                                     AS request_id,
          ('IMP-' || i.import_id)::text                 AS reference_code,
          u.department                                  AS department_name,
          'IMPORT'::text                                AS group_type,
          'นำเข้า'::text                                AS event_type,
          COALESCE(i.import_note, 'นำเข้าสินค้าจากซัพพลายเออร์') AS detail,
          i.import_date::timestamp                      AS "timestamp",
          i.import_status                               AS status,
          COALESCE(u.user_fname, '') || ' ' || COALESCE(u.user_lname, '') AS user_name,
          NULL::text                                    AS items_summary,
          NULL::text                                    AS request_mode_thai
        FROM imports i
        LEFT JOIN users u ON i.user_id = u.user_id

        UNION ALL

        /* ---------- คืนสินค้า (ระบบยืม-คืน) ---------- */
        SELECT
          br.return_id                                  AS id,
          req.request_id                                AS request_id,
          COALESCE(req.request_code, ('REQ-' || req.request_id)) AS reference_code,
          u.department                                  AS department_name,
          'RETURN'::text                                AS group_type,
          'คืนสินค้า'::text                             AS event_type,
          'รายการ: ' || i.item_name || ' จำนวน ' || br.return_qty || ' ชิ้น' AS detail,
          br.return_date::timestamp                     AS "timestamp",
          CASE WHEN br.return_qty = rd.approved_qty THEN 'returned_complete' ELSE 'returned_partially' END::text AS status,
          COALESCE(u.user_fname, '') || ' ' || COALESCE(u.user_lname, '') AS user_name,
          NULL::text                                    AS items_summary,
          NULL::text                                    AS request_mode_thai
        FROM borrow_returns br
        JOIN request_details rd ON rd.request_detail_id = br.request_detail_id
        JOIN requests req ON req.request_id = rd.request_id
        LEFT JOIN items i ON rd.item_id = i.item_id
        LEFT JOIN users u ON br.inspected_by = u.user_id

        UNION ALL

        /* ---------- จัดการสต็อก ---------- */
        SELECT
          sm.move_id                                    AS id,
          NULL::int                                     AS request_id,
          COALESCE(sm.move_code, ('MOV-' || sm.move_id)::text) AS reference_code,  -- ★ ใช้ move_code
          u.department                                  AS department_name,
          'STOCK_MOVEMENT'::text                        AS group_type,
          CASE
            WHEN sm.move_type = 'stock_cut' THEN 'ตัดสต็อก'
            WHEN sm.move_type = 'stock_add' THEN 'เพิ่มสต็อก'
            ELSE sm.move_type
          END::text                                     AS event_type,
          COALESCE(sm.note, '')                         AS detail,
          sm.move_date::timestamp                       AS "timestamp",
          sm.move_status                                AS status,
          COALESCE(u.user_fname, '') || ' ' || COALESCE(u.user_lname, '') AS user_name,
          NULL::text                                    AS items_summary,
          NULL::text                                    AS request_mode_thai
        FROM stock_movements sm
        LEFT JOIN users u ON sm.user_id = u.user_id
      )
    `;

    // ฟิลเตอร์
    let whereClause = `WHERE 1=1 `;
    const validSortColumns = ['timestamp', 'reference_code', 'group_type', 'event_type', 'user_name'];
    const finalSortColumn = validSortColumns.includes(sort_by) ? sort_by : 'timestamp';
    const finalSortOrder = (String(sort_order || '').toLowerCase() === 'asc') ? 'ASC' : 'DESC';

    if (type) {
      whereClause += ` AND group_type = $${paramIndex++}`;
      whereParams.push(type);
    }
    if (search) {
      const s = `%${String(search).toLowerCase()}%`;
      whereClause += ` AND (
        LOWER(user_name) LIKE $${paramIndex}
        OR LOWER(reference_code) LIKE $${paramIndex}
        OR LOWER(detail) LIKE $${paramIndex}
        OR LOWER(COALESCE(items_summary,'')) LIKE $${paramIndex}
      )`;
      whereParams.push(s);
      paramIndex++;
    }

    const client = await pool.connect();
    try {
      const safePage = Math.max(1, Number(page) || 1);
      const safeLimit = Math.max(1, Math.min(100, Number(limit) || 10));
      const offset = (safePage - 1) * safeLimit;

      if (group) {
        const countQuery = `
          ${baseQuery}
          SELECT COUNT(*) FROM (
              SELECT DISTINCT reference_code, group_type
              FROM unified_logs
              ${whereClause}
          ) x;
        `;
        const dataQuery = `
          ${baseQuery}
          , latest_per_group AS (
            SELECT DISTINCT ON (reference_code, group_type)
              id,
              request_id,
              reference_code,
              group_type,
              event_type,
              detail,
              "timestamp",
              status,
              user_name,
              department_name,
              items_summary,
              request_mode_thai
            FROM unified_logs
            ${whereClause}
            ORDER BY reference_code, group_type, "timestamp" DESC
          )
          SELECT *
          FROM latest_per_group
          ORDER BY "timestamp" DESC
          OFFSET $${paramIndex++}
          LIMIT $${paramIndex++};
        `;

        const dataParams = [...whereParams, offset, safeLimit];

        const countRes = await client.query(countQuery, whereParams);
        const totalCount = parseInt(countRes.rows[0]?.count, 10) || 0;
        const totalPages = Math.ceil(totalCount / safeLimit);

        const rowsRes = await client.query(dataQuery, dataParams);

        return { data: rowsRes.rows, totalCount, totalPages, currentPage: safePage };
      }

      // DETAIL: ไทม์ไลน์ทั้งหมด
      const countQuery = `
        ${baseQuery}
        SELECT COUNT(*) FROM unified_logs ${whereClause};
      `;
      const dataQuery = `
        ${baseQuery}
        SELECT
          id,
          request_id,
          reference_code,
          group_type,
          event_type,
          detail,
          "timestamp",
          status,
          user_name,
          department_name,
          items_summary,
          request_mode_thai
        FROM unified_logs
        ${whereClause}
        ORDER BY "${finalSortColumn}" ${finalSortOrder}
        OFFSET $${paramIndex++}
        LIMIT $${paramIndex++};
      `;
      const dataParams = [...whereParams, offset, safeLimit];

      const countRes = await client.query(countQuery, whereParams);
      const totalCount = parseInt(countRes.rows[0]?.count, 10) || 0;
      const totalPages = Math.ceil(totalCount / safeLimit);

      const rowsRes = await client.query(dataQuery, dataParams);

      return { data: rowsRes.rows, totalCount, totalPages, currentPage: safePage };
    } catch (err) {
      console.error('Error in getAllFilteredLogs:', err);
      throw err;
    } finally {
      client.release();
    }
  },

  async getRequestSummary(requestId) {
    const sql = `
      SELECT
        r.request_id,
        r.request_code,
        r.request_date,
        r.request_note,
        r.request_type,
        r.request_status,
        r.overall_processing_status,
        u.user_id,
        COALESCE(u.user_fname, '') || ' ' || COALESCE(u.user_lname, '') AS user_name,
        u.department
      FROM requests r
      LEFT JOIN users u ON r.user_id = u.user_id
      WHERE r.request_id = $1
      LIMIT 1;
    `;
    const { rows } = await pool.query(sql, [requestId]);
    return rows[0] || null;
  },

  async getApprovalAndStatusHistoryByRequestId(requestId) {
    const client = await pool.connect();
    try {
      const approvalQuery = `
        SELECT
          rsh.changed_at,
          u.user_fname || ' ' || u.user_lname AS changed_by_user,
          i.item_name,
          rd.requested_qty,
          rd.approved_qty,
          rsh.new_value,
          rsh.note
        FROM request_status_history rsh
        JOIN request_details rd ON rsh.request_detail_id = rd.request_detail_id
        JOIN items i ON rd.item_id = i.item_id
        LEFT JOIN users u ON rsh.changed_by = u.user_id
        WHERE 
          rsh.request_id = $1 
          AND rsh.old_value_type = 'approval_status'
          AND rsh.new_value IN ('approved','rejected')
        ORDER BY rsh.changed_at DESC;
      `;

      const processingQuery = `
        SELECT
          rsh.changed_at,
          u.user_fname || ' ' || u.user_lname AS changed_by_user,
          i.item_name,
          rsh.old_value,
          rsh.new_value,
          rsh.note
        FROM request_status_history rsh
        JOIN request_details rd ON rsh.request_detail_id = rd.request_detail_id
        JOIN items i ON rd.item_id = i.item_id
        LEFT JOIN users u ON rsh.changed_by = u.user_id
        WHERE rsh.request_id = $1 AND rsh.old_value_type = 'processing_status'
        ORDER BY rsh.changed_at DESC;
      `;

      const approvalRes = await client.query(approvalQuery, [requestId]);
      const processingRes = await client.query(processingQuery, [requestId]);

      return {
        approvalHistory: approvalRes.rows,
        processingHistory: processingRes.rows,
      };
    } catch (err) {
      console.error('Error in getApprovalAndStatusHistoryByRequestId:', err);
      throw err;
    } finally {
      client.release();
    }
  },

  async getRequestLineItems(requestId) {
    const sql = `
      SELECT
        rd.request_detail_id,
        rd.item_id,
        i.item_name,
        i.item_unit,
        rd.requested_qty,
        rd.approved_qty,
        COALESCE(lat_appr.new_value, rd.approval_status)   AS approval_status,
        COALESCE(lat_proc.new_value, rd.processing_status) AS processing_status,
        rd.expected_return_date,
        rd.request_detail_note,
        COALESCE(rd.request_detail_type, r.request_type)   AS request_mode,
        CASE
          WHEN LOWER(COALESCE(rd.request_detail_type, r.request_type)) IN ('borrow','ยืม') THEN 'ยืม'
          ELSE 'เบิก'
        END                                               AS request_mode_thai
      FROM request_details rd
      JOIN requests r ON r.request_id = rd.request_id
      JOIN items i   ON i.item_id    = rd.item_id

      LEFT JOIN LATERAL (
        SELECT rsh.new_value
        FROM request_status_history rsh
        WHERE rsh.request_detail_id = rd.request_detail_id
          AND rsh.old_value_type = 'approval_status'
        ORDER BY rsh.changed_at DESC
        LIMIT 1
      ) AS lat_appr ON TRUE

      LEFT JOIN LATERAL (
        SELECT rsh.old_value, rsh.new_value
        FROM request_status_history rsh
        WHERE rsh.request_detail_id = rd.request_detail_id
          AND rsh.old_value_type = 'processing_status'
        ORDER BY rsh.changed_at DESC
        LIMIT 1
      ) AS lat_proc ON TRUE

      WHERE rd.request_id = $1
      ORDER BY rd.request_detail_id;
    `;
    const { rows } = await pool.query(sql, [requestId]);
    return rows;
  },

    async getStockMovementByCode(moveCode) {
    const sql = `
      SELECT
        sm.move_id,
        sm.move_code,
        sm.item_id,
        i.item_name,
        sm.move_qty,
        sm.move_date,
        sm.move_status,
        sm.note,
        COALESCE(u.user_fname, '') || ' ' || COALESCE(u.user_lname, '') AS user_name
      FROM stock_movements sm
      LEFT JOIN items i ON i.item_id = sm.item_id
      LEFT JOIN users u ON u.user_id = sm.user_id
      WHERE sm.move_code = $1
      ORDER BY sm.move_id ASC;
    `;
    const { rows } = await pool.query(sql, [moveCode]);
    return rows;
  },
  
};

module.exports = TransactionHistory;
