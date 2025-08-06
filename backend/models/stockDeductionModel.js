const { pool } = require('../config/db'); // ตรวจสอบ Path ของ db.js ให้ถูกต้อง

/**
 * Fetches a list of requests that have at least one detail item
 * with 'approved' approval_status and 'pending' processing_status.
 */
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
        r.request_status AS status, -- Overall approval status
        COUNT(rd.request_detail_id) FILTER (WHERE rd.approval_status = 'approved' AND rd.processing_status = 'pending') AS pending_deduction_items_count
      FROM requests r
      JOIN users u ON r.user_id = u.user_id
      JOIN request_details rd ON r.request_id = rd.request_id
      WHERE rd.approval_status = 'approved'
        AND rd.processing_status = 'pending'
      GROUP BY r.request_id, r.request_code, r.request_date, u.user_fname, u.user_lname, u.department, r.request_type, r.request_status
      ORDER BY r.request_date DESC;
    `;
    const { rows } = await pool.query(query);
    return rows;
  } catch (error) {
    console.error('Error fetching requests ready for processing from DB (Model):', error);
    throw new Error('Failed to retrieve requests ready for processing.');
  }
}

/**
 * Fetches detailed information for a single request, including all its items,
 * their approval_status, processing_status, and current stock quantities.
 */
async function getRequestDetailsForProcessing(requestId) {
  try {
    // First, get the overall request details
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

    if (requestRows.length === 0) {
      return null;
    }

    const request = requestRows[0];

    // Then, get the details of ALL items associated with this request, including their processing_status
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

    console.log("Fetched itemRows from DB:", itemRows);

    request.details = itemRows;

    return request;

  } catch (error) {
    console.error(`Error fetching details for request ${requestId} from DB (Model):`, error);
    throw new Error('Failed to retrieve request details for processing.');
  }
}

/**
 * Performs the actual stock deduction for an approved request by updating processing_status.
 */
async function deductStock(requestId, updates, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const update of updates) {
      const { request_detail_id, newStatus, current_approval_status, current_processing_status, item_id, requested_qty, deduction_reason } = update;

      if (current_approval_status !== 'approved') {
        throw new Error(`Item ${request_detail_id} (Item ID: ${item_id}) cannot be processed as its approval status is '${current_approval_status}'.`);
      }

      // ตรวจสอบว่ากำลังจะเปลี่ยนสถานะจาก 'pending' เป็น 'preparing' และทำการตัดสต็อก
      if (newStatus === 'preparing' && current_processing_status === 'pending') {
        const stockCheckQuery = `SELECT item_qty FROM items WHERE item_id = $1 FOR UPDATE;`;
        const { rows: itemRows } = await client.query(stockCheckQuery, [item_id]);

        if (itemRows.length === 0) {
          throw new Error(`Item ${item_id} not found in stock.`);
        }
        const currentStock = itemRows[0].item_qty;
        
        console.log(`[DeductStock] Processing item ${item_id}. Requested: ${requested_qty}, Current Stock: ${currentStock}`);

        if (requested_qty > currentStock) {
          throw new Error(`Insufficient stock for item "${item_id}". Available: ${currentStock}, Attempted to deduct: ${requested_qty}.`);
        }

        const deductStockQuery = `UPDATE items SET item_qty = item_qty - $1, item_update = NOW() WHERE item_id = $2;`;
        await client.query(deductStockQuery, [requested_qty, item_id]);

        let movementNote = `เบิก-จ่ายตามคำขอ #${requestId}, รายการ ${item_id}. จำนวน: ${requested_qty}.`;
        if (deduction_reason) {
          movementNote += ` เหตุผล: ${deduction_reason}`;
        }
        const insertMovementQuery = `
          INSERT INTO stock_movements (item_id, move_type, move_qty, move_date, move_status, user_id, note)
          VALUES ($1, $2, $3, NOW(), $4, $5, $6);
        `;
        await client.query(insertMovementQuery, [
          item_id,
          'เบิก-จ่าย',
          requested_qty,
          'completed',
          userId,
          movementNote
        ]);
      }

      // 1. บันทึกประวัติการเปลี่ยนสถานะใน request_status_history
      // Note: `note` field in `request_status_history` is now optional or can be a generic message
      await client.query(
        `INSERT INTO request_status_history (request_id, request_detail_id, old_status, new_status, changed_by, changed_at, note, status_type)
          VALUES ($1, $2, $3, $4, $5, NOW(), $6, 'processing_detail');`, // ใช้ 'processing_detail' สำหรับ status_type
        [
          requestId,
          request_detail_id,
          current_processing_status,
          newStatus,
          userId,
          `เปลี่ยนสถานะการดำเนินการจาก '${current_processing_status || 'ไม่ระบุ'}' เป็น '${newStatus}'.` // ข้อความ note ทั่วไป
        ]
      );

      // 2. อัปเดต processing_status ใน request_details
      const updateDetailStatusQuery = `
        UPDATE request_details
        SET processing_status = $1, updated_at = NOW()
        WHERE request_detail_id = $2
        AND approval_status = 'approved'
        AND processing_status IS NOT DISTINCT FROM $3;
      `;
      const detailUpdateResult = await client.query(updateDetailStatusQuery, [
        newStatus,
        request_detail_id,
        current_processing_status
      ]);

      if (detailUpdateResult.rowCount === 0) {
        throw new Error(`Failed to update processing status for detail ${request_detail_id}. It might have been updated by another user or is not in the expected status.`);
      }

      // 3. อัปเดต request_detail_note เฉพาะเมื่อมี deduction_reason
      if (deduction_reason && deduction_reason.trim() !== '') {
        const reasonNote = `\n[${new Date().toLocaleString('th-TH')}] เหตุผลเบิกไม่ครบ: ${deduction_reason}.`;
        const updateReasonQuery = `
              UPDATE request_details
              SET request_detail_note = COALESCE(request_detail_note, '') || $1
              WHERE request_detail_id = $2;
          `;
        await client.query(updateReasonQuery, [reasonNote, request_detail_id]);
      }
    }

    await client.query('COMMIT');
    return { success: true, message: `Processing status updated for request details in request ${requestId}` };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during stock deduction transaction (Model):', error);
    throw error;
  } finally {
    client.release();
  }
}

// Export the functions for use in controllers
module.exports = {
  getApprovedRequestsForDeduction,
  getRequestDetailsForProcessing,
  deductStock
};