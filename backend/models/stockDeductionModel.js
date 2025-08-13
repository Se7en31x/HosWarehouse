// backend/models/stockDeductionModel.js
const { pool } = require('../config/db'); // ตรวจสอบ Path ของ db.js ให้ถูกต้อง

/* ====================== Helpers ====================== */
/** ใช้ตารางตัวนับรายวัน เพื่อสร้างรหัส MOV-YYYYMMDD-#### แบบกันชนพร้อมกัน */
async function generateMoveBatchCode(client) {
  // ใช้เวลา DB (เสถียรกว่า server)
  const { rows: nowRows } = await client.query(`SELECT CURRENT_DATE::date AS d`);
  const d = nowRows[0].d; // JS Date
  // เตรียมแถววันนี้ถ้ายังไม่มี
  await client.query(`
    CREATE TABLE IF NOT EXISTS stock_move_counter (
      counter_date date PRIMARY KEY,
      last_seq integer NOT NULL
    )`);
  await client.query(
    `INSERT INTO stock_move_counter(counter_date, last_seq)
     VALUES ($1, 0)
     ON CONFLICT (counter_date) DO NOTHING`,
    [d]
  );
  // อัปเดตเลขลำดับแบบ atomic แล้วอ่านกลับ
  const { rows } = await client.query(
    `UPDATE stock_move_counter
       SET last_seq = last_seq + 1
     WHERE counter_date = $1
    RETURNING last_seq`,
    [d]
  );
  const seq = rows[0].last_seq; // 1,2,3,...
  const y  = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const seqStr = String(seq).padStart(4, '0');
  return `MOV-${y}${mm}${dd}-${seqStr}`;
}

/* ====================== Queries หลัก ====================== */

/** รายการคำขอที่มีแถวอนุมัติแล้ว */
async function getApprovedRequestsForDeduction() {
  try {
    const query = `
      SELECT
        r.request_id,
        r.request_code,
        r.request_date,
        u.user_fname || ' ' || u.user_lname AS requester,
        u.department AS department,
        r.request_type AS type,
        r.request_status AS status,
        COUNT(rd.request_detail_id) FILTER (WHERE rd.approval_status = 'approved') AS total_approved_count,
        COUNT(rd.request_detail_id) FILTER (WHERE rd.approval_status = 'approved' AND rd.processing_status = 'pending')    AS pending_count,
        COUNT(rd.request_detail_id) FILTER (WHERE rd.approval_status = 'approved' AND rd.processing_status = 'preparing')  AS preparing_count,
        COUNT(rd.request_detail_id) FILTER (WHERE rd.approval_status = 'approved' AND rd.processing_status = 'delivering') AS delivering_count
      FROM requests r
      JOIN users u ON r.user_id = u.user_id
      JOIN request_details rd ON r.request_id = rd.request_id
      WHERE rd.approval_status = 'approved'
      GROUP BY
        r.request_id, r.request_code, r.request_date,
        u.user_fname, u.user_lname, u.department,
        r.request_type, r.request_status
      ORDER BY r.request_date DESC;
    `;
    const { rows } = await pool.query(query);
    return rows;
  } catch (error) {
    console.error('Error fetching requests ready for processing from DB (Model):', error);
    throw new Error('Failed to retrieve requests ready for processing.');
  }
}

/** รายละเอียดคำขอ + รายการ */
async function getRequestDetailsForProcessing(requestId) {
  try {
    const requestQuery = `
      SELECT
        r.request_id,
        r.request_code,
        r.request_date,
        u.user_fname || ' ' || u.user_lname AS user_name,
        u.department AS department_name,
        r.request_type,
        r.request_status,
        r.updated_at,
        r.request_note
      FROM requests r
      JOIN users u ON r.user_id = u.user_id
      WHERE r.request_id = $1;
    `;
    const { rows: requestRows } = await pool.query(requestQuery, [requestId]);
    if (requestRows.length === 0) return null;

    const request = requestRows[0];

    const itemsQuery = `
      SELECT
        rd.request_detail_id,
        rd.item_id,
        i.item_name,
        i.item_unit,
        rd.requested_qty,
        rd.approved_qty,
        rd.approval_status,
        rd.processing_status,
        i.item_qty AS current_stock_qty,
        i.item_exp,
        i.item_status,
        rd.request_detail_note,
        rd.updated_at AS detail_updated_at
      FROM request_details rd
      JOIN items i ON rd.item_id = i.item_id
      WHERE rd.request_id = $1
      ORDER BY rd.request_detail_id ASC;
    `;
    const { rows: itemRows } = await pool.query(itemsQuery, [requestId]);

    request.details = itemRows;
    return request;
  } catch (error) {
    console.error(`Error fetching details for request ${requestId} from DB (Model):`, error);
    throw new Error('Failed to retrieve request details for processing.');
  }
}

/**
 * ตัดสต็อกทั้งคำขอ (transaction เดียว):
 * - อัปเดต items
 * - insert stock_movements (ใช้ move_code เดียวทั้งก้อน)
 * - บันทึก request_status_history (processing_status_change)
 * - อัปเดต request_details.processing_status
 * - ถ้ามี error ตรงไหน → ROLLBACK ทั้งหมด
 */
async function deductStock(requestId, updates, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ★ รหัสก้อน movement แบบมาตรฐาน MOV-YYYYMMDD-#### (atomic)
    const moveBatchCode = await generateMoveBatchCode(client);

    for (const update of updates) {
      const {
        request_detail_id,
        newStatus,
        current_approval_status,
        current_processing_status,
        item_id,
        requested_qty,
        deduction_reason
      } = update;

      if (current_approval_status !== 'approved') {
        throw new Error(`Item ${request_detail_id} (item ${item_id}) approval_status='${current_approval_status}'`);
      }

      // จาก 'pending' -> 'preparing' ตัดสต็อก
      if (newStatus === 'preparing' && current_processing_status === 'pending') {
        // 1) ล็อคสต็อก
        const { rows: itemRows } = await client.query(
          `SELECT item_qty FROM items WHERE item_id = $1 FOR UPDATE`,
          [item_id]
        );
        if (itemRows.length === 0) throw new Error(`Item ${item_id} not found in stock.`);
        const currentStock = itemRows[0].item_qty;

        if (requested_qty > currentStock) {
          throw new Error(`Insufficient stock for item ${item_id}. Have ${currentStock}, need ${requested_qty}.`);
        }

        // 2) อัปเดตคงเหลือ (timestamp without time zone)
        await client.query(
          `UPDATE items
             SET item_qty = item_qty - $1,
                 item_update = NOW()::timestamp
           WHERE item_id = $2`,
          [requested_qty, item_id]
        );

        // 3) insert movement (ใช้ move_code เดียวทั้งก้อน)
        const note =
          `ตัดสต็อกจากคำขอ #${requestId}, item ${item_id}, qty ${requested_qty}` +
          (deduction_reason ? `, เหตุผล: ${deduction_reason}` : '');

        await client.query(
          `INSERT INTO stock_movements
              (item_id, move_type, move_qty, move_date, move_status, user_id, note, move_code)
           VALUES
              ($1,      'stock_cut', $2,       NOW()::timestamp, 'completed', $3,     $4,   $5)`,
          [item_id, requested_qty, userId, note, moveBatchCode]
        );
      }

      // 4) บันทึกประวัติการเปลี่ยนสถานะ (ให้ตรงกับหน้าประวัติ)
      await client.query(
        `INSERT INTO request_status_history
           (request_id, request_detail_id, changed_by, changed_at,
            history_type, old_value_type, old_value, new_value, note)
         VALUES
           ($1, $2, $3, NOW(),
            'processing_status_change', 'processing_status', $4, $5,
            $6)`,
        [
          requestId,
          request_detail_id,
          userId,
          current_processing_status,
          newStatus,
          `เปลี่ยนสถานะการดำเนินการจาก '${current_processing_status || 'ไม่ระบุ'}' เป็น '${newStatus}'.`
        ]
      );

      // 5) อัปเดตสถานะ detail (optimistic check)
      const resUpd = await client.query(
        `UPDATE request_details
            SET processing_status = $1,
                updated_at = NOW()::timestamp
          WHERE request_detail_id = $2
            AND approval_status = 'approved'
            AND processing_status IS NOT DISTINCT FROM $3`,
        [newStatus, request_detail_id, current_processing_status]
      );
      if (resUpd.rowCount === 0) {
        throw new Error(`Failed to update processing status for detail ${request_detail_id} (concurrent update?).`);
      }

      // 6) แนบเหตุผล (ถ้ามี)
      if (deduction_reason && deduction_reason.trim() !== '') {
        const reasonNote = `\n[${new Date().toLocaleString('th-TH')}] เหตุผลเบิกไม่ครบ: ${deduction_reason}.`;
        await client.query(
          `UPDATE request_details
              SET request_detail_note = COALESCE(request_detail_note, '') || $1
            WHERE request_detail_id = $2`,
          [reasonNote, request_detail_id]
        );
      }
    }

    await client.query('COMMIT');
    return {
      success: true,
      message: `Updated processing & stock for request ${requestId}`,
      move_code: moveBatchCode
    };
  } catch (error) {
    // ★ rollback ทั้งก้อน
    try { await client.query('ROLLBACK'); } catch (e) { /* ignore */ }
    console.error('Error during stock deduction transaction (Model):', error);
    throw error;
  } finally {
    client.release();
  }
}

/* ====================== Exports ====================== */
module.exports = {
  getApprovedRequestsForDeduction,
  getRequestDetailsForProcessing,
  deductStock
};
