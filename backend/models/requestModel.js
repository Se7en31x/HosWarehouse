const { pool } = require("../config/db");
const { generateDocNo } = require("../utils/docCounter"); // ✅ ใช้จาก utils

const RequestModel = {
  // -----------------------------
  // 1. สร้างคำขอหลัก
  // -----------------------------
  async createRequest({ user_id, note, urgent, date, type }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // ✅ gen รหัส เช่น REQ-2025-0001
      const request_code = await generateDocNo(client, "request");

      const result = await client.query(
        `INSERT INTO requests
          (request_code, user_id, request_status, request_note, is_urgent, request_due_date, request_date, request_type, is_deleted, updated_at)
         VALUES ($1, $2, 'waiting_approval', $3, $4, $5, NOW(), $6, false, NOW())
         RETURNING request_id, request_code`,
        [request_code, user_id, note, urgent, date, type]
      );

      const newRequestId = result.rows[0].request_id;

      // ✅ log ลง history
      await client.query(
        `INSERT INTO request_status_history
          (request_id, changed_by, changed_at, history_type, old_value_type, old_value, new_value, note)
         VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7)`,
        [
          newRequestId,
          user_id,
          "request_creation",
          "request_status",
          null,
          "waiting_approval",
          "สร้างคำขอใหม่",
        ]
      );

      await client.query("COMMIT");
      return result.rows[0];
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("❌ Error in createRequest:", err);
      throw err;
    } finally {
      client.release();
    }
  },

  // -----------------------------
  // 2. เพิ่มรายการย่อย
  // -----------------------------
  async addRequestDetail({
    request_id,
    item_id,
    quantity,
    request_detail_type,
    user_id,
    expected_return_date,
  }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const result = await client.query(
        `INSERT INTO request_details
          (request_id, item_id, requested_qty, request_detail_type, approval_status, processing_status, expected_return_date, updated_at)
         VALUES ($1, $2, $3, $4, 'waiting_approval_detail', 'pending', $5, NOW())
         RETURNING request_detail_id`,
        [request_id, item_id, quantity, request_detail_type, expected_return_date]
      );

      const newRequestDetailId = result.rows[0].request_detail_id;

      // ✅ log ลง history
      await client.query(
        `INSERT INTO request_status_history
          (request_id, request_detail_id, changed_by, changed_at, history_type, old_value_type, old_value, new_value, note)
         VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8)`,
        [
          request_id,
          newRequestDetailId,
          user_id,
          "detail_creation",
          "approval_status",
          null,
          "waiting_approval_detail",
          "สร้างรายการย่อยใหม่",
        ]
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("❌ Error in addRequestDetail:", err);
      throw err;
    } finally {
      client.release();
    }
  },

  // -----------------------------
  // 3. ดึงคำขอแยกตามสถานะ
  // -----------------------------
  async getRequestsByStatus(statuses = ["waiting_approval"]) {
    const params = statuses.map((_, i) => `$${i + 1}`).join(", ");

    const query = `
      SELECT
        r.request_id,
        r.request_code,
        r.request_date,
        r.request_status,
        (u.firstname || ' ' || u.lastname) AS user_name,
        d.department_name_th AS department,
        STRING_AGG(DISTINCT
          CASE
            WHEN rd.request_detail_type = 'borrow' THEN 'ยืม'
            WHEN rd.request_detail_type = 'withdraw' THEN 'เบิก'
            ELSE rd.request_detail_type
          END,
          ','
        ) AS request_types,
        COUNT(rd.request_detail_id) AS item_count
      FROM requests r
      JOIN "Admin".users u ON r.user_id = u.user_id
      LEFT JOIN "Admin".user_departments ud ON u.user_id = ud.user_id
      LEFT JOIN "Admin".departments d ON ud.department_id = d.department_id
      LEFT JOIN request_details rd ON r.request_id = rd.request_id
      WHERE r.request_status IN (${params})
      GROUP BY r.request_id, r.request_date, r.request_status, u.firstname, u.lastname, d.department_name_th
      ORDER BY
        CASE WHEN r.request_status = 'waiting_approval' THEN 0 ELSE 1 END,
        r.request_date DESC;
    `;

    const result = await pool.query(query, statuses);
    return result.rows;
  },
};

module.exports = RequestModel;
