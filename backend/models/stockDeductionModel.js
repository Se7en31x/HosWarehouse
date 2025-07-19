const { pool } = require('../config/db'); // ตรวจสอบ Path ของ db.js ให้ถูกต้อง

/**
 * Fetches a list of requests that have at least one detail item
 * with 'approved' approval_status and 'pending' processing_status.
 */
async function getApprovedRequestsForDeduction() {
  try {
    const query = `
      SELECT DISTINCT
        r.request_id,
        r.request_code,
        r.request_date,
        u.user_fname || ' ' || u.user_lname AS requester, 
        u.department AS department,
        r.request_type AS type,
        r.request_status AS status
      FROM requests r
      JOIN users u ON r.user_id = u.user_id
      JOIN request_details rd ON r.request_id = rd.request_id
      WHERE rd.approval_status = 'approved'
        AND rd.processing_status = 'pending'
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
      const { request_detail_id, newStatus, current_approval_status, current_processing_status, item_id, requested_qty } = update;

      if (current_approval_status !== 'approved') {
        throw new Error(`Item ${request_detail_id} (Item ID: ${item_id}) cannot be processed as its approval status is '${current_approval_status}'.`);
      }

      // ตรวจสอบว่ากำลังจะเปลี่ยนสถานะจาก 'pending' เป็น 'preparing' และทำการตัดสต็อก
      // ถ้า newStatus เป็น 'preparing' และ current_processing_status เป็น 'pending' (คือเริ่มเตรียมของ)
      if (newStatus === 'preparing' && current_processing_status === 'pending') {
        const stockCheckQuery = `SELECT item_qty FROM items WHERE item_id = $1 FOR UPDATE;`;
        const { rows: itemRows } = await client.query(stockCheckQuery, [item_id]);

        if (itemRows.length === 0) {
          throw new Error(`Item ${item_id} not found in stock.`);
        }
        const currentStock = itemRows[0].item_qty;

        if (requested_qty > currentStock) {
          throw new Error(`Insufficient stock for item "${item_id}". Available: ${currentStock}, Attempted to deduct: ${requested_qty}.`);
        }

        const deductStockQuery = `UPDATE items SET item_qty = item_qty - $1, item_update = NOW() WHERE item_id = $2;`;
        await client.query(deductStockQuery, [requested_qty, item_id]);

        const movementNote = `เบิก-จ่ายตามคำขอ #${requestId}, รายการ ${item_id}. จำนวน: ${requested_qty}.`;
        const insertMovementQuery = `
          INSERT INTO stock_movements (item_id, move_type, move_qty, move_date, move_status, user_id, note)
          VALUES ($1, $2, $3, NOW(), $4, $5, $6);
        `;
        await client.query(insertMovementQuery, [
          item_id,
          'เบิก-จ่าย', // หรือ 'Withdrawal' แล้วแต่ประเภทการเบิกของคุณ
          requested_qty,
          'completed', // สถานะของรายการเคลื่อนไหวสต็อก
          userId,
          movementNote
        ]);
      }
      
      const updateDetailStatusQuery = `
        UPDATE request_details
        SET processing_status = $1, updated_at = NOW(),
            request_detail_note = COALESCE(request_detail_note, '') || $2
        WHERE request_detail_id = $3
        AND approval_status = 'approved'
        -- *** แก้ไขตรงนี้: ใช้ IS NOT DISTINCT FROM เพื่อเปรียบเทียบค่าได้อย่างถูกต้อง รวมถึง NULL ***
        AND processing_status IS NOT DISTINCT FROM $4;
      `;
      const detailNote = `\n[${new Date().toLocaleString('th-TH')}] เปลี่ยนสถานะเป็น '${newStatus}' โดย User ID: ${userId}.`;

      const detailUpdateResult = await client.query(updateDetailStatusQuery, [
        newStatus,
        detailNote,
        request_detail_id,
        current_processing_status // ใช้สถานะปัจจุบันเพื่อความถูกต้อง
      ]);

      if (detailUpdateResult.rowCount === 0) {
        throw new Error(`Failed to update processing status for detail ${request_detail_id}. It might have been updated by another user or is not in the expected status.`);
      }
    }

    // ตรวจสอบสถานะรวมของคำขอหลังจากอัปเดตแต่ละรายการย่อย
    // ถ้าทุกรายการที่อนุมัติ (approved) กลายเป็น 'completed' หมดแล้ว
    const checkAllApprovedCompletedQuery = `
        SELECT NOT EXISTS (
            SELECT 1 FROM request_details
            WHERE request_id = $1
            AND approval_status = 'approved'
            AND processing_status != 'completed' -- ยังมีรายการที่ 'approved' แต่ยังไม่ 'completed'
        ) AS all_approved_completed;
    `;
    const { rows: [result] } = await client.query(checkAllApprovedCompletedQuery, [requestId]);
    
    if (result.all_approved_completed) {
        // ถ้าทุกรายการที่อนุมัติเสร็จสิ้นแล้ว ให้อัปเดตสถานะรวมเป็น 'completed'
        const updateOverallRequestStatusQuery = `
            UPDATE requests
            SET request_status = 'completed', updated_at = NOW()
            WHERE request_id = $1;
        `;
        await client.query(updateOverallRequestStatusQuery, [requestId]);
    } else {
        // หากยังมีบางรายการที่อนุมัติแล้ว แต่ยังไม่เสร็จสิ้น ('pending', 'preparing', 'delivering')
        // ให้อัปเดตสถานะรวมของคำขอเป็นสถานะการดำเนินการที่ 'ต่ำที่สุด'
        const getLowestProcessingStatus = `
            SELECT processing_status FROM request_details
            WHERE request_id = $1 AND approval_status = 'approved'
            ORDER BY
                CASE processing_status
                    WHEN 'pending' THEN 1
                    WHEN 'preparing' THEN 2
                    WHEN 'delivering' THEN 3
                    WHEN 'completed' THEN 4
                    ELSE 5 -- สำหรับสถานะอื่นๆ ที่ไม่ได้อยู่ใน flow หลัก
                END
            LIMIT 1;
        `;
        const { rows: [lowestStatusRow] } = await client.query(getLowestProcessingStatus, [requestId]);

        if (lowestStatusRow) {
            const updateOverallRequestStatusQuery = `
                UPDATE requests
                SET request_status = $1, updated_at = NOW()
                WHERE request_id = $2;
            `;
            await client.query(updateOverallRequestStatusQuery, [lowestStatusRow.processing_status, requestId]);
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