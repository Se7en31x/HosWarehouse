const { pool } = require("../config/db");

/**
 * ดึงคำขอทั้งหมดพร้อมชื่อผู้ใช้และแผนก โดยกรองตามสถานะของคำขอหลัก.
 *
 * @param {string[]} allowedStatuses - Array ของสถานะที่อนุญาตให้ดึง.
 * @returns {Promise<object[]>} Array ของ object คำขอ.
 */
exports.getAllRequestsWithUser = async (allowedStatuses) => {
  // สร้างเงื่อนไข IN สำหรับ SQL query
  // ป้องกัน SQL Injection โดยการใช้ parameterized query หรือตรวจสอบค่าที่เข้ามา
  // แต่ในกรณีนี้ allowedStatuses มาจากค่าคงที่ใน frontend จึงปลอดภัยในระดับหนึ่ง
  const statusConditions = allowedStatuses.map(s => `'${s}'`).join(',');

  const query = `
    SELECT r.*, u.user_name, u.department
    FROM requests r
    JOIN users u ON r.user_id = u.user_id
    WHERE r.request_status IN (${statusConditions})
    ORDER BY r.request_date DESC
  `;
  const result = await pool.query(query);
  return result.rows;
};

/**
 * ดึงข้อมูลคำขอหลักพร้อมชื่อผู้ใช้และแผนก.
 *
 * @param {number} request_id - ID ของคำขอ.
 * @returns {Promise<object>} ข้อมูลคำขอหลัก.
 */
exports.getRequestById = async (request_id) => {
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
 * ดึงรายละเอียดรายการคำขอทั้งหมดสำหรับคำขอที่ระบุ พร้อมชื่อพัสดุและหน่วย.
 *
 * @param {number} request_id - ID ของคำขอ.
 * @returns {Promise<object[]>} Array ของ object รายละเอียดรายการคำขอ.
 */
exports.getRequestDetails = async (request_id) => {
  const query = `
    SELECT rd.*, i.item_name, i.item_unit
    FROM request_details rd
    JOIN items i ON rd.item_id = i.item_id
    WHERE rd.request_id = $1
    ORDER BY rd.request_detail_id ASC
  `;
  const result = await pool.query(query, [request_id]);
  return result.rows;
};

/**
 * อัปเดตสถานะ 'request_status' ของคำขอหลัก และบันทึกประวัติ.
 *
 * @param {number} request_id - ID ของคำขอหลัก.
 * @param {string} newStatus - สถานะใหม่ที่จะตั้ง.
 * @param {number} changed_by - ID ผู้ใช้งานที่ทำการเปลี่ยนแปลง.
 * @returns {Promise<boolean>} true หากอัปเดตสำเร็จ.
 */
exports.updateRequestOverallStatus = async (request_id, newStatus, changed_by) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. ดึงสถานะปัจจุบันของคำขอหลัก
    const oldStatusResult = await client.query(
      `SELECT request_status FROM requests WHERE request_id = $1`,
      [request_id]
    );
    if (oldStatusResult.rows.length === 0) {
      throw new Error(`Request with ID ${request_id} not found.`);
    }
    const oldStatus = oldStatusResult.rows[0].request_status;

    // 2. อัปเดตสถานะ request_status และ updated_at
    const updateResult = await client.query(
      `UPDATE requests SET request_status = $1, updated_at = NOW() WHERE request_id = $2`,
      [newStatus, request_id]
    );

    // 3. บันทึกประวัติการเปลี่ยนแปลงสถานะ (เฉพาะถ้าสถานะมีการเปลี่ยนแปลง)
    if (updateResult.rowCount > 0 && oldStatus !== newStatus) {
      await client.query(
        `INSERT INTO request_status_history
          (request_id, old_status, new_status, changed_by, changed_at, note, status_type, request_detail_id)
          VALUES ($1, $2, $3, $4, NOW(), 'อัปเดตสถานะคำขอหลักในหน้าจัดการดำเนินการ', 'request_overall', NULL)`,
        [request_id, oldStatus, newStatus, changed_by]
      );
    }

    await client.query('COMMIT');
    return updateResult.rowCount > 0;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error in updateRequestOverallStatus:", err);
    throw err;
  } finally {
    client.release();
  }
};


/**
 * อัปเดตสถานะ 'processing_status' ของรายการย่อย.
 *
 * @param {number} request_id - ID ของคำขอหลัก (เพื่อให้มั่นใจว่ารายการย่อยอยู่ภายใต้คำขอที่ถูกต้อง).
 * @param {number} request_detail_id - ID ของรายการย่อย.
 * @param {string} newProcessingStatus - สถานะการดำเนินการใหม่ ('pending', 'preparing', 'delivering', 'completed').
 * @param {number} changed_by - ID ผู้ใช้งานที่ทำการเปลี่ยนแปลง (สำหรับบันทึกประวัติ).
 * @returns {Promise<boolean>} true หากอัปเดตสำเร็จ.
 */
exports.updateRequestDetailProcessingStatus = async (request_id, request_detail_id, newProcessingStatus, changed_by) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. ดึงสถานะ processing_status เดิมและ approval_status ของรายการย่อย
    const oldStatusResult = await client.query(
      `SELECT processing_status, approval_status FROM request_details WHERE request_detail_id = $1 AND request_id = $2`,
      [request_detail_id, request_id]
    );
    if (oldStatusResult.rows.length === 0) {
      throw new Error(`Request detail with ID ${request_detail_id} not found in request ${request_id}.`);
    }
    const { processing_status: oldProcessingStatus, approval_status } = oldStatusResult.rows[0];

    // เพิ่มการตรวจสอบ: สามารถอัปเดตได้เฉพาะรายการที่ approval_status เป็น 'approved' เท่านั้น
    if (approval_status !== 'approved') {
        throw new Error(`ไม่สามารถเปลี่ยนสถานะดำเนินการของรายการที่ยังไม่ถูกอนุมัติ (สถานะปัจจุบัน: ${approval_status})`);
    }

    // 2. อัปเดต processing_status
    const updateResult = await client.query(
      `UPDATE request_details SET processing_status = $1, updated_at = NOW()
        WHERE request_detail_id = $2 AND request_id = $3`,
      [newProcessingStatus, request_detail_id, request_id]
    );

    // 3. บันทึกประวัติสถานะของรายการย่อย (เฉพาะถ้าสถานะมีการเปลี่ยนแปลง)
    if (updateResult.rowCount > 0 && oldProcessingStatus !== newProcessingStatus) {
      await client.query(
        `INSERT INTO request_status_history
          (request_id, request_detail_id, old_status, new_status, changed_by, changed_at, note, status_type)
          VALUES ($1, $2, $3, $4, $5, NOW(), 'อัปเดตสถานะดำเนินการรายการย่อย', 'processing_detail')`,
        [request_id, request_detail_id, oldProcessingStatus, newProcessingStatus, changed_by]
      );
    }

    await client.query('COMMIT');
    return updateResult.rowCount > 0;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error in updateRequestDetailProcessingStatus:", err);
    throw err;
  } finally {
    client.release();
  }
};

/**
 * คำนวณสถานะรวมของคำขอหลักจาก 'processing_status' ของรายการย่อยทั้งหมดที่ "อนุมัติแล้ว".
 * สถานะจะอิงตามขั้นตอนที่ยังไม่สมบูรณ์ที่ "ต่ำที่สุด" (เช่น ถ้ามี Preparing และ Delivering, Overall คือ Preparing)
 *
 * @param {number} request_id - ID ของคำขอ.
 * @returns {Promise<string>} สถานะโดยรวม ('pending', 'preparing', 'delivering', 'completed', หรือ 'unknown').
 */
exports.calculateOverallProcessingStatus = async (request_id) => {
  const query = `
    SELECT processing_status, approval_status
    FROM request_details
    WHERE request_id = $1
  `;
  const result = await pool.query(query, [request_id]);
  const details = result.rows;

  if (details.length === 0) {
    // ไม่มีรายการย่อยในคำขอเลย อาจจะเกิดจากข้อมูลไม่สมบูรณ์
    return 'unknown';
  }

  // กรองเฉพาะรายการที่ได้รับการอนุมัติแล้วเท่านั้น (`approval_status = 'approved'`)
  const approvedDetails = details.filter(d => d.approval_status === 'approved');

  // ตรวจสอบสถานะการอนุมัติโดยรวมของคำขอ
  const requestOverallApprovalStatusResult = await pool.query(
      `SELECT request_status FROM requests WHERE request_id = $1`,
      [request_id]
  );
  const requestOverallApprovalStatus = requestOverallApprovalStatusResult.rows[0]?.request_status;


  if (approvedDetails.length === 0) {
    // ถ้าไม่มีรายการย่อยที่อนุมัติเลย
    // สถานะโดยรวมของคำขอหลักจะเป็น 'rejected_all', 'waiting_approval', หรือ 'rejected_partial'
    // ซึ่งสถานะเหล่านี้ไม่ได้แสดงในหน้าจัดการดำเนินการ
    // ดังนั้น ถ้าไม่มีรายการอนุมัติ, สถานะการดำเนินการรวมควรเป็น 'unknown'
    return 'unknown';
  }

  const processingStatuses = approvedDetails.map(d => d.processing_status);

  // กำหนดลำดับของสถานะการดำเนินการ (จากเร็วไปช้า)
  const statusOrder = ['pending', 'preparing', 'delivering', 'completed'];

  // เริ่มต้นด้วยสถานะที่ "สมบูรณ์ที่สุด" (completed)
  let overallProcessingStep = 'completed';

  for (const status of processingStatuses) {
    const statusIndex = statusOrder.indexOf(status);
    if (statusIndex === -1) {
      // หากพบสถานะที่ไม่รู้จัก ให้ถือว่าเป็น 'unknown' หรือจัดการตามที่เหมาะสม
      return 'unknown';
    }

    // หากพบสถานะที่ "ยังไม่สมบูรณ์" และอยู่ในลำดับที่เร็วกว่า 'overallProcessingStep' ปัจจุบัน
    if (statusIndex < statusOrder.indexOf(overallProcessingStep)) {
      overallProcessingStep = status;
    }
  }

  // Logic เพิ่มเติมเพื่อจัดการสถานะ 'pending' ให้เป็น 'preparing' หากคำขอได้รับการอนุมัติแล้ว
  // ถ้าทุกรายการย่อยที่อนุมัติอยู่ในสถานะ 'pending'
  if (overallProcessingStep === 'pending') {
      // และสถานะหลักของคำขอ (request_status) เป็นหนึ่งในสถานะที่บ่งบอกว่าอนุมัติแล้ว
      if (['approved_all', 'approved_partial_and_rejected_partial', 'stock_deducted'].includes(requestOverallApprovalStatus)) {
          // สามารถเปลี่ยนไปเป็น 'preparing' ได้ทันที
          return 'preparing';
      }
  }

  return overallProcessingStep;
};


/**
 * อัปเดตสถานะ 'request_status' ของคำขอหลักตาม 'processing_status' ของรายการย่อยที่อนุมัติแล้ว
 *
 * @param {number} request_id - ID ของคำขอ.
 * @param {number} changed_by - ID ผู้ใช้งานที่ทำการเปลี่ยนแปลง.
 * @returns {Promise<boolean>} true หากอัปเดตสำเร็จ.
 */
exports.updateRequestOverallStatusByProcessingDetails = async (request_id, changed_by) => {
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

    // 2. คำนวณสถานะการดำเนินการรวมจากรายการย่อยที่อนุมัติแล้ว
    const newOverallProcessingStatus = await exports.calculateOverallProcessingStatus(request_id);

    let finalOverallRequestStatus = oldRequestStatus; // เริ่มต้นด้วยสถานะเดิมของคำขอหลัก

    // กำหนดสถานะ `request_status` ของคำขอหลัก
    // โดยยึดตามสถานะ `processing_status` ที่คำนวณได้
    // และสถานะการอนุมัติรวมของคำขอ
    switch (newOverallProcessingStatus) {
        case 'completed':
            finalOverallRequestStatus = 'completed';
            break;
        case 'delivering':
            finalOverallRequestStatus = 'delivering';
            break;
        case 'preparing':
            finalOverallRequestStatus = 'preparing';
            break;
        case 'pending':
            // ถ้า calculateOverallProcessingStatus ส่งกลับมาเป็น 'pending'
            // หมายความว่าทุกรายการที่อนุมัติยังอยู่ในสถานะ 'pending'
            // สถานะ request_status ควรจะเป็น 'pending' หรือ 'approved_all' / 'approved_partial_and_rejected_partial'
            // ขึ้นอยู่กับว่าการอนุมัติจบสิ้นหรือยัง
            const overallApprovalStatusResult = await pool.query(
                `SELECT request_status FROM requests WHERE request_id = $1`,
                [request_id]
            );
            const currentOverallApprovalStatus = overallApprovalStatusResult.rows[0]?.request_status;

            // ลบ 'stock_deducted' ออกจากเงื่อนไขนี้ เพื่อให้สอดคล้องกับ calculateOverallProcessingStatus
            if (['approved_all', 'approved_partial_and_rejected_partial'].includes(currentOverallApprovalStatus)) {
                finalOverallRequestStatus = 'pending'; // เปลี่ยนเป็น pending เพื่อรอการจัดเตรียม
            }
            // หาก currentOverallApprovalStatus เป็น waiting_approval, approved_partial, rejected_partial
            // ไม่ควรเปลี่ยนสถานะ request_status ในส่วนนี้ เพราะยังอยู่ในขั้นตอนการอนุมัติ
            break;
        case 'unknown':
            // ถ้าไม่มีรายการที่อนุมัติ หรือสถานะแปลกๆ
            // ให้คงสถานะ request_status เดิมไว้ หรือจัดการตาม Logic ที่เหมาะสม
            // ในที่นี้จะคง oldRequestStatus ไว้
            break;
    }

    // 3. อัปเดตสถานะ request_status ของคำขอหลัก หากมีการเปลี่ยนแปลง
    let updateResult = false;
    if (oldRequestStatus !== finalOverallRequestStatus) {
        updateResult = await exports.updateRequestOverallStatus(request_id, finalOverallRequestStatus, changed_by);
    } else {
        updateResult = true; // ถือว่าสำเร็จถ้าไม่มีการเปลี่ยนแปลงสถานะ
    }


    await client.query('COMMIT');
    return updateResult;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error in updateRequestOverallStatusByProcessingDetails:", err);
    throw err;
  } finally {
    client.release();
  }
};
