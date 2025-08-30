const { pool } = require("../config/db");

// Helper function เพื่อดึง user_id จาก request_detail_id (ยังคงอยู่เพราะอาจใช้ในการบันทึกประวัติ)
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
 * อัปเดตสถานะของคำขอหลักในตาราง 'requests' (เป็นฟังก์ชันพื้นฐานที่ใช้โดยหลายโมดูล)
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
 * @param {number} newApprovedQty - จำนวนที่อนุมัติใหม่
 * @param {number} changed_by - ID ผู้ใช้งานที่ทำการเปลี่ยนแปลง
 * @param {string} note - หมายเหตุ/เหตุผลในการเปลี่ยนแปลง (optional)
 * @returns {Promise<boolean>} true หากอัปเดตสำเร็จ
 */
exports.updateRequestDetailApprovalStatus = async (request_detail_id, newApprovalStatus, newApprovedQty, changed_by, note = null) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. ดึงข้อมูลเดิม (รวม request_type ด้วย)
        const oldStatusResult = await client.query(
            `SELECT rd.approval_status, rd.approved_qty, rd.request_id, rd.processing_status, r.request_type
             FROM request_details rd
             JOIN requests r ON rd.request_id = r.request_id
             WHERE rd.request_detail_id = $1 FOR UPDATE`,
            [request_detail_id]
        );
        if (oldStatusResult.rows.length === 0) {
            throw new Error(`Request detail with ID ${request_detail_id} not found.`);
        }
        const oldRow = oldStatusResult.rows[0];
        const oldApprovalStatus = oldRow.approval_status;
        const oldApprovedQty = oldRow.approved_qty;
        const oldProcessingStatus = oldRow.processing_status;
        const request_id_from_detail = oldRow.request_id;
        const request_type = oldRow.request_type;

        // 2. กำหนดค่า processing_status ใหม่ตามเงื่อนไข
        let newProcessingStatusForUpdate = oldProcessingStatus;
        if (newApprovalStatus === 'approved') {
            newProcessingStatusForUpdate = 'approved_in_queue';
        } else if (newApprovalStatus === 'rejected') {
            newProcessingStatusForUpdate = 'rejected';
        } else if (newApprovalStatus === 'waiting_approval_detail') {
            newProcessingStatusForUpdate = 'waiting_approval';
        }

        // 3. อัปเดต approval_status, approved_qty, note, processing_status
        const query = `
            UPDATE request_details
            SET approval_status = $1, 
                approved_qty = $2, 
                request_detail_note = $3, 
                processing_status = $4, 
                updated_at = NOW()
            WHERE request_detail_id = $5
            RETURNING *
        `;
        const params = [newApprovalStatus, newApprovedQty, note, newProcessingStatusForUpdate, request_detail_id];
        const result = await client.query(query, params);

        // 3.1 ถ้าเป็น borrow และอนุมัติ → อัปเดต borrow_status = waiting_borrow
        if (newApprovalStatus === 'approved' && request_type === 'borrow') {
            await client.query(
                `UPDATE request_details
                 SET borrow_status = 'waiting_borrow'
                 WHERE request_detail_id = $1`,
                [request_detail_id]
            );
        }

        // 4. Log ประวัติ approval_status
        const hasApprovalStatusOrQtyChanged = (oldApprovalStatus !== newApprovalStatus) || (oldApprovedQty !== newApprovedQty);
        if (result.rowCount > 0 && hasApprovalStatusOrQtyChanged) {
            await client.query(
                `INSERT INTO request_status_history
                 (request_id, request_detail_id, old_value_type, old_value, new_value, changed_by, changed_at, note, history_type)
                 VALUES ($1, $2, 'approval_status', $3, $4, $5, NOW(), $6, 'approval_detail_status_change')`,
                [request_id_from_detail, request_detail_id, oldApprovalStatus, newApprovalStatus, changed_by, note || `อัปเดตสถานะอนุมัติรายการย่อย ID: ${request_detail_id}`]
            );
        }

        // 5. Log ประวัติ processing_status
        const hasProcessingStatusChanged = (oldProcessingStatus !== newProcessingStatusForUpdate);
        if (result.rowCount > 0 && hasProcessingStatusChanged) {
            await client.query(
                `INSERT INTO request_status_history
                 (request_id, request_detail_id, old_value_type, old_value, new_value, changed_by, changed_at, note, history_type)
                 VALUES ($1, $2, 'processing_status', $3, $4, $5, NOW(), $6, 'processing_status_change')`,
                [request_id_from_detail, request_detail_id, oldProcessingStatus, newProcessingStatusForUpdate, changed_by, `เปลี่ยนสถานะการดำเนินการของรายการย่อยเป็น: ${newProcessingStatusForUpdate}`]
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
 */
exports.updateRequestOverallStatusByDetails = async (request_id, changed_by) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // ดึงสถานะปัจจุบัน
        const oldRequestStatusResult = await client.query(
            `SELECT request_status FROM requests WHERE request_id = $1 FOR UPDATE`,
            [request_id]
        );
        if (oldRequestStatusResult.rows.length === 0) {
            throw new Error(`Request with ID ${request_id} not found.`);
        }
        const oldRequestStatus = oldRequestStatusResult.rows[0].request_status;

        // คำนวณสถานะย่อย
        const { total, approvedCount, rejectedCount } = await exports.calculateOverallApprovalStatus(request_id);

        let finalOverallStatus;
        if (approvedCount === total) {
            finalOverallStatus = 'approved_all';
        } else if (rejectedCount === total) {
            finalOverallStatus = 'rejected_all';
        } else {
            // กรณีผสม (บางอนุมัติ บางปฏิเสธ) หรือยังไม่ครบ → ให้เป็น approved_partial
            finalOverallStatus = 'approved_partial';
        }

        // อัปเดตเฉพาะถ้าเปลี่ยนจริง
        let updateSuccess = false;
        if (oldRequestStatus !== finalOverallStatus) {
            const updateResult = await client.query(
                `UPDATE requests 
                 SET request_status = $1, 
                     updated_at = NOW(), 
                     updated_by = $2, 
                     approved_by = $2, 
                     approved_at = NOW()
                 WHERE request_id = $3`,
                [finalOverallStatus, changed_by, request_id]
            );
            updateSuccess = updateResult.rowCount > 0;

            if (updateSuccess) {
                await client.query(
                    `INSERT INTO request_status_history
                     (request_id, changed_by, changed_at, old_value_type, old_value, new_value, note, history_type)
                     VALUES ($1, $2, NOW(), 'request_status', $3, $4,
                             'อัปเดตสถานะคำขอรวมจากการอนุมัติ/ปฏิเสธรายการย่อย', 'approval_overall_status_change')`,
                    [request_id, changed_by, oldRequestStatus, finalOverallStatus]
                );
            }
        } else {
            updateSuccess = true;
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


// Export the functions for use in controllers
module.exports = {
    getRequestForApproval: exports.getRequestForApproval,
    getRequestDetails: exports.getRequestDetails,
    updateRequestOverallStatus: exports.updateRequestOverallStatus,
    updateRequestDetailApprovalStatus: exports.updateRequestDetailApprovalStatus,
    calculateOverallApprovalStatus: exports.calculateOverallApprovalStatus,
    updateRequestOverallStatusByDetails: exports.updateRequestOverallStatusByDetails,
};