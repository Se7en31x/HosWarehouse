const { pool } = require("../config/db");

// Helper function เพื่อดึง user_id จาก request_detail_id
// (อาจจะซ้ำกับที่อื่น แต่แยกไว้เพื่อให้ Model นี้พึ่งตัวเองได้)
const getUserIdByRequestDetailId = async (request_detail_id) => {
  const result = await pool.query(
    `SELECT r.user_id FROM request_details rd JOIN requests r ON rd.request_id = r.request_id WHERE rd.request_detail_id = $1`,
    [request_detail_id]
  );
  return result.rows[0]?.user_id || null;
};

/**
 * ดึงข้อมูลคำขอหลักสำหรับการแสดงผลในหน้าอนุมัติ
 *
 * @param {number} request_id - ID ของคำขอ
 * @returns {Promise<object>} ข้อมูลคำขอหลักพร้อมชื่อผู้ใช้และแผนก
 */
exports.getRequestForApproval = async (request_id) => {
  const query = `
    SELECT r.*, u.user_name, u.department
    FROM requests r
    JOIN users u ON r.user_id = u.user_id
    WHERE r.request_id = $1
  `;
  const result = await pool.query(query, [request_id]);
  return result.rows[0];
};

/**
 * ดึงรายละเอียดรายการคำขอทั้งหมดสำหรับคำขอที่ระบุ
 *
 * @param {number} request_id - ID ของคำขอ
 * @returns {Promise<object[]>} Array ของ object รายละเอียดรายการคำขอ
 */
exports.getRequestDetails = async (request_id) => {
  const query = `
    SELECT rd.*, i.item_name, i.item_unit, i.item_img
    FROM request_details rd
    JOIN items i ON rd.item_id = i.item_id
    WHERE rd.request_id = $1
  `;
  const result = await pool.query(query, [request_id]);
  return result.rows;
};

/**
 * อัปเดตสถานะของคำขอหลักในตาราง 'requests'
 *
 * @param {number} request_id - ID ของคำขอ
 * @param {string} newStatus - สถานะใหม่ที่จะตั้ง
 * @returns {Promise<boolean>} true หากอัปเดตสำเร็จ
 */
exports.updateRequestOverallStatus = async (request_id, newStatus) => {
  const result = await pool.query(
    `UPDATE requests SET request_status = $1 WHERE request_id = $2`,
    [newStatus, request_id]
  );
  return result.rowCount > 0;
};

/**
 * อัปเดตสถานะการอนุมัติ (approval_status) ของรายการย่อย
 * และบันทึกเหตุผลถ้ามี พร้อมทั้งบันทึกประวัติ
 *
 * @param {number} request_detail_id - ID ของรายการย่อย
 * @param {string} newApprovalStatus - สถานะการอนุมัติใหม่ ('approved', 'rejected', 'waiting_approval_detail')
 * @param {number} changed_by - ID ผู้ใช้งานที่ทำการเปลี่ยนแปลง
 * @param {string} note - หมายเหตุ/เหตุผลในการเปลี่ยนแปลง (optional)
 * @returns {Promise<boolean>} true หากอัปเดตสำเร็จ
 */

/**
 * อัปเดตสถานะการอนุมัติ (approval_status) ของรายการย่อย
 * และบันทึกเหตุผลถ้ามี พร้อมทั้งบันทึกประวัติ
 *
 * @param {number} request_detail_id - ID ของรายการย่อย
 * @param {string} newApprovalStatus - สถานะการอนุมัติใหม่ ('approved', 'rejected', 'waiting_approval_detail')
 * @param {number} newApprovedQty - **<<<<<< เพิ่มตรงนี้: จำนวนที่อนุมัติใหม่**
 * @param {number} changed_by - ID ผู้ใช้งานที่ทำการเปลี่ยนแปลง
 * @param {string} note - หมายเหตุ/เหตุผลในการเปลี่ยนแปลง (optional)
 * @returns {Promise<boolean>} true หากอัปเดตสำเร็จ
 */
exports.updateRequestDetailApprovalStatus = async (request_detail_id, newApprovalStatus, newApprovedQty, changed_by, note = null) => { // <<<< แก้ไข: เพิ่ม parameter 'newApprovedQty'
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. ดึงสถานะ approval_status และ approved_qty เดิม
        const oldStatusResult = await client.query(
            `SELECT approval_status, approved_qty, request_id FROM request_details WHERE request_detail_id = $1`,
            [request_detail_id]
        );
        if (oldStatusResult.rows.length === 0) {
            throw new Error(`Request detail with ID ${request_detail_id} not found.`);
        }
        const oldApprovalStatus = oldStatusResult.rows[0].approval_status;
        const oldApprovedQty = oldStatusResult.rows[0].approved_qty; // <<<< เพิ่มตรงนี้: ดึงค่า approved_qty เดิม
        const request_id_from_detail = oldStatusResult.rows[0].request_id;

        // 2. อัปเดต approval_status, approved_qty และ request_detail_note
        let query, params;
        // <<<< เพิ่มตรงนี้: ตรวจสอบว่ามีการเปลี่ยนแปลง status หรือ approved_qty เพื่อดูว่าควรบันทึกประวัติหรือไม่
        const hasStatusOrQtyChanged = (oldApprovalStatus !== newApprovalStatus) || (oldApprovedQty !== newApprovedQty);

        if (note) {
            query = `
                UPDATE request_details
                SET approval_status = $1, approved_qty = $2, request_detail_note = $3
                WHERE request_detail_id = $4
            `;
            // <<<< แก้ไข: ลำดับ parameter ให้ตรงกับ query ($1=newApprovalStatus, $2=newApprovedQty, $3=note, $4=request_detail_id)
            params = [newApprovalStatus, newApprovedQty, note, request_detail_id];
        } else {
            query = `
                UPDATE request_details
                SET approval_status = $1, approved_qty = $2, request_detail_note = NULL
                WHERE request_detail_id = $3
            `;
            // <<<< แก้ไข: ลำดับ parameter ให้ตรงกับ query ($1=newApprovalStatus, $2=newApprovedQty, $3=request_detail_id)
            params = [newApprovalStatus, newApprovedQty, request_detail_id];
        }
        const result = await client.query(query, params);

        // 3. บันทึกประวัติสถานะการอนุมัติของรายการย่อย
        // <<<< แก้ไข: เงื่อนไขการบันทึกประวัติให้ครอบคลุมการเปลี่ยนแปลงจำนวนด้วย
        if (result.rowCount > 0 && hasStatusOrQtyChanged) {
            await client.query(
                `INSERT INTO request_status_history
                 (request_id, request_detail_id, old_status, new_status, changed_by, changed_at, note, status_type, old_approved_qty, new_approved_qty) -- <<<< แก้ไข: เพิ่ม 2 คอลัมน์นี้ในตาราง history ของคุณ
                 VALUES ($1, $2, $3, $4, $5, NOW(), $6, 'approval_detail', $7, $8)`, // <<<< แก้ไข: เพิ่ม $7, $8 สำหรับค่า approved_qty
                [request_id_from_detail, request_detail_id, oldApprovalStatus, newApprovalStatus, changed_by, note || `อัปเดตสถานะอนุมัติรายการย่อย ID: ${request_detail_id}`, oldApprovedQty, newApprovedQty] // <<<< แก้ไข: เพิ่มค่า oldApprovedQty, newApprovedQty
            );
        }

        await client.query('COMMIT');
        return result.rowCount > 0;
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error in updateRequestDetailApprovalStatus:", err);
        throw err;
    } finally {
        client.release();
    }
};

/**
 * คำนวณและคืนค่าการนับสถานะของรายการย่อยทั้งหมดสำหรับคำขอที่ระบุ
 *
 * @param {number} request_id - ID ของคำขอ
 * @returns {Promise<object>} Object ที่มีจำนวน approved, rejected, waiting และ total ของรายการย่อย
 */
exports.calculateOverallApprovalStatus = async (request_id) => {
  const query = `
        SELECT approval_status
        FROM request_details
        WHERE request_id = $1
    `;
  const result = await pool.query(query, [request_id]);
  const statuses = result.rows.map(row => row.approval_status);

  const total = statuses.length;
  const approvedCount = statuses.filter(s => s === 'approved').length;
  const rejectedCount = statuses.filter(s => s === 'rejected').length;
  const waitingCount = statuses.filter(s => s === 'waiting_approval_detail').length;

  return { total, approvedCount, rejectedCount, waitingCount };
};


/**
 * อัปเดตสถานะคำขอหลัก (requests.request_status) ตามสถานะ approval_status ของรายการย่อย
 * และบันทึกประวัติการเปลี่ยนแปลง
 *
 * @param {number} request_id - ID ของคำขอ
 * @param {number} changed_by - ID ผู้ใช้งานที่ทำการเปลี่ยนแปลง (ผู้ที่อนุมัติ/ปฏิเสธ)
 * @returns {Promise<boolean>} true หากอัปเดตสำเร็จ
 */
exports.updateRequestOverallStatusByDetails = async (request_id, changed_by) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. ดึงสถานะปัจจุบันของคำขอหลัก
    const oldRequestStatusResult = await client.query(
      `SELECT request_status FROM requests WHERE request_id = $1`,
      [request_id]
    );
    if (oldRequestStatusResult.rows.length === 0) {
      throw new Error(`Request with ID ${request_id} not found.`);
    }
    const oldRequestStatus = oldRequestStatusResult.rows[0].request_status;

    // 2. คำนวณสถานะใหม่จากรายการย่อย
    const { total, approvedCount, rejectedCount, waitingCount } = await exports.calculateOverallApprovalStatus(request_id);

    // 3. กำหนด finalOverallStatus ตามผลการนับ
    let finalOverallStatus;

    if (total === 0) {
      finalOverallStatus = 'waiting_approval';
    } else if (approvedCount === total) {
      // ถ้าทุกรายการย่อยเป็น 'approved'
      finalOverallStatus = 'approved_all';
    } else if (rejectedCount === total) {
      // ถ้าทุกรายการย่อยเป็น 'rejected'
      finalOverallStatus = 'rejected_all';
    } else if (approvedCount > 0 && rejectedCount > 0) {
      // มีทั้ง 'approved' และ 'rejected' ปนกัน (ไม่ว่าจะมี waiting หรือไม่)
      finalOverallStatus = 'approved_partial_and_rejected_partial';
    } else if (approvedCount > 0) {
      // มี 'approved' อย่างน้อย 1 รายการ และไม่มี 'rejected' เลย
      // (สถานะนี้จะถูกตั้งแม้ว่าจะมี 'waiting' อยู่ด้วยก็ตาม)
      finalOverallStatus = 'approved_partial';
    } else if (rejectedCount > 0) {
      // มี 'rejected' อย่างน้อย 1 รายการ และไม่มี 'approved' เลย
      // (สถานะนี้จะถูกตั้งแม้ว่าจะมี 'waiting' อยู่ด้วยก็ตาม)
      finalOverallStatus = 'rejected_partial';
    } else if (waitingCount > 0) {
      // กรณีสุดท้าย: มีแต่รายการที่รออนุมัติเท่านั้น (ไม่มี approved หรือ rejected เลย)
      finalOverallStatus = 'waiting_approval';
    } else {
      finalOverallStatus = 'unknown_status';
    }
    // ... (ส่วนที่เหลือ)
    // 4. อัปเดตสถานะคำขอหลัก หากมีการเปลี่ยนแปลงจากสถานะเดิม
    let updateSuccess = false;
    if (oldRequestStatus !== finalOverallStatus) {
      updateSuccess = await exports.updateRequestOverallStatus(request_id, finalOverallStatus);
    } else {
      updateSuccess = true; // ไม่มีอะไรเปลี่ยนแปลง ถือว่าดำเนินการสำเร็จ
    }

    // 5. บันทึกประวัติสถานะของคำขอหลัก หากมีการเปลี่ยนแปลงและอัปเดตสำเร็จ
    if (updateSuccess && oldRequestStatus !== finalOverallStatus) {
      await client.query(
        `INSERT INTO request_status_history
                  (request_id, old_status, new_status, changed_by, changed_at, note, status_type, request_detail_id)
                  VALUES ($1, $2, $3, $4, NOW(), 'อัปเดตสถานะคำขอรวมจากการอนุมัติ/ปฏิเสธรายการย่อย', 'request_overall', NULL)`,
        [request_id, oldRequestStatus, finalOverallStatus, changed_by]
      );
    }
    await client.query('COMMIT');
    return updateSuccess;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error in updateRequestOverallStatusByDetails:", err);
    throw err;
  } finally {
    client.release();
  }
};