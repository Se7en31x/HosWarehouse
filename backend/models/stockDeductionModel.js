const { pool } = require('../config/db'); // ตรวจสอบ Path ของ db.js

/**
 * Fetches a list of requests that are approved (fully or partially)
 * and are ready for stock deduction.
 */
async function getApprovedRequestsForDeduction() {
  try {
    const query = `
      SELECT
        r.request_id,
        r.request_code,
        r.request_date,
        u.user_fname || ' ' || u.user_lname AS requester_name,
        u.department,
        r.request_type,
        r.request_status
      FROM requests r
      JOIN users u ON r.user_id = u.user_id
      WHERE r.request_status IN ('approved_all', 'approved_partial')
      ORDER BY r.request_date DESC;
    `;
    const { rows } = await pool.query(query);
    return rows;
  } catch (error) {
    console.error('Error fetching approved requests for deduction from DB:', error);
    throw new Error('Failed to retrieve approved requests.');
  }
}

/**
 * Fetches detailed information for a single approved request,
 * including its approved items and their current stock quantities.
 */
async function getRequestDetailsForDeduction(requestId) {
  try {
    // First, get the overall request details
    const requestQuery = `
      SELECT
        r.request_id,
        r.request_code,
        r.request_date,
        u.user_fname || ' ' || u.user_lname AS requester_name,
        u.department,
        r.request_type,
        r.request_status
      FROM requests r
      JOIN users u ON r.user_id = u.user_id
      WHERE r.request_id = $1 AND r.request_status IN ('approved_all', 'approved_partial', 'stock_deducted');
    `;
    const { rows: requestRows } = await pool.query(requestQuery, [requestId]);

    if (requestRows.length === 0) {
      return null;
    }

    const request = requestRows[0];

    // Then, get the details of items associated with this request
    const itemsQuery = `
      SELECT
        rd.request_detail_id,
        rd.item_id,
        i.item_name,
        i.item_unit,
        rd.requested_qty,
        rd.approved_qty,
        rd.approval_status,
        i.item_qty AS current_stock_qty,
        i.item_exp, -- ดึงวันหมดอายุ
        i.item_status -- ดึงสถานะสินค้า (เช่น ปกติ, เสียหาย)
      FROM request_details rd
      JOIN items i ON rd.item_id = i.item_id
      WHERE rd.request_id = $1 AND rd.approval_status IN ('approved', 'approved_partial');
    `;
    const { rows: itemRows } = await pool.query(itemsQuery, [requestId]);

    request.items = itemRows;

    return request;

  } catch (error) {
    console.error(`Error fetching details for request ${requestId} from DB:`, error);
    throw new Error('Failed to retrieve request details.');
  }
}

/**
 * Performs the actual stock deduction for an approved request.
 * This function should be wrapped in a database transaction for atomicity.
 * @param {number} requestId - The ID of the request to deduct stock for.
 * @param {Array<Object>} itemsToDeduct - An array of items with item_id, actual_deducted_qty, and deduction_reason.
 * @param {number} userId - The ID of the user performing the deduction.
 */
async function deductStock(requestId, itemsToDeduct, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Check current stock and perform deduction for each item
    for (const item of itemsToDeduct) {
      const { item_id, actual_deducted_qty, deduction_reason } = item;

      // Get current stock and approved quantity from request_details for server-side validation
      const itemDetailsQuery = `
        SELECT i.item_qty, rd.approved_qty
        FROM items i
        JOIN request_details rd ON i.item_id = rd.item_id
        WHERE i.item_id = $1 AND rd.request_id = $2 FOR UPDATE;
      `;
      const { rows: detailsRows } = await client.query(itemDetailsQuery, [item_id, requestId]);

      if (detailsRows.length === 0) {
        throw new Error(`Item with ID ${item_id} not found in request or stock.`);
      }

      const currentStock = detailsRows[0].item_qty;
      const approvedQty = detailsRows[0].approved_qty;

      // Server-side validation
      if (actual_deducted_qty < 0) {
        throw new Error(`Actual deducted quantity for item ${item_id} cannot be negative.`);
      }
      if (actual_deducted_qty > approvedQty) {
        throw new Error(`Actual deducted quantity for item ${item_id} (${actual_deducted_qty}) exceeds approved quantity (${approvedQty}).`);
      }
      if (actual_deducted_qty > currentStock) {
        throw new Error(`Insufficient stock for item ${item_id}. Available: ${currentStock}, Attempted to deduct: ${actual_deducted_qty}`);
      }
      if (actual_deducted_qty < approvedQty && !deduction_reason.trim()) {
        throw new Error(`Reason for partial deduction is required for item ${item_id}.`);
      }

      // Deduct stock only if actual_deducted_qty > 0
      if (actual_deducted_qty > 0) {
        const updateStockQuery = 'UPDATE items SET item_qty = item_qty - $1, item_update = NOW() WHERE item_id = $2;';
        await client.query(updateStockQuery, [actual_deducted_qty, item_id]);
      }
      
      // 2. Record stock movement
      const movementNote = `เบิก-จ่ายตามคำขอ ${requestId}. จำนวนอนุมัติ: ${approvedQty}, จำนวนเบิกจริง: ${actual_deducted_qty}.` + 
                           (deduction_reason.trim() ? ` เหตุผล: ${deduction_reason}` : '');

      const insertMovementQuery = `
        INSERT INTO stock_movements (item_id, move_type, move_qty, move_date, move_status, user_id, note)
        VALUES ($1, $2, $3, NOW(), $4, $5, $6);
      `;
      await client.query(insertMovementQuery, [
        item_id,
        'เบิก-จ่าย',
        actual_deducted_qty,
        'completed',
        userId,
        movementNote
      ]);

      // Optional: Update request_details with actual_deducted_qty if you add a column for it
      // For example: `UPDATE request_details SET actual_deducted_qty = $1 WHERE request_detail_id = $2;`
    }

    // 3. Update request status to 'stock_deducted'
    const updateRequestStatusQuery = `
      UPDATE requests
      SET request_status = $1, request_note = COALESCE(request_note, '') || $2, updated_at = NOW()
      WHERE request_id = $3 AND request_status IN ('approved_all', 'approved_partial');
    `;
    const updateResult = await client.query(updateRequestStatusQuery, [
      'stock_deducted',
      `\n[${new Date().toLocaleString('th-TH')}] เบิก-จ่ายสต็อกแล้วโดย User ID: ${userId}.`,
      requestId
    ]);

    if (updateResult.rowCount === 0) {
      throw new Error('Request status could not be updated. It might have been processed already or not found.');
    }

    await client.query('COMMIT');
    return { success: true, message: `Stock deducted for request ${requestId}` };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during stock deduction transaction:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getApprovedRequestsForDeduction,
  getRequestDetailsForDeduction,
  deductStock
};
