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

        // 1. ดึงสถานะ approval_status, approved_qty, และ request_id เดิม
        const oldStatusResult = await client.query(
            `SELECT approval_status, approved_qty, request_id, processing_status FROM request_details WHERE request_detail_id = $1`, // ดึง processing_status เดิมมาด้วย
            [request_detail_id]
        );
        if (oldStatusResult.rows.length === 0) {
            throw new Error(`Request detail with ID ${request_detail_id} not found.`);
        }
        const oldApprovalStatus = oldStatusResult.rows[0].approval_status;
        const oldApprovedQty = oldStatusResult.rows[0].approved_qty;
        const oldProcessingStatus = oldStatusResult.rows[0].processing_status; // เก็บค่าเดิม
        const request_id_from_detail = oldStatusResult.rows[0].request_id;

        // 2. กำหนดค่า processing_status ใหม่ตามเงื่อนไข
        let newProcessingStatusForUpdate = oldProcessingStatus; // ตั้งต้นด้วยค่าเดิม
        if (newApprovalStatus === 'approved') {
            newProcessingStatusForUpdate = 'approved_in_queue';
        } else if (newApprovalStatus === 'rejected') {
            // เมื่อถูกปฏิเสธ processing_status ควรถูกเคลียร์ หรือตั้งเป็นสถานะที่บ่งบอกว่าไม่ได้อยู่ในคิวประมวลผล
            newProcessingStatusForUpdate = null; // หรือ 'rejected_queue' ขึ้นอยู่กับดีไซน์
        }
        // ถ้าสถานะยังเป็น 'waiting_approval_detail' ให้ processing_status เป็น null
        else if (newApprovalStatus === 'waiting_approval_detail') {
             newProcessingStatusForUpdate = null;
        }


        // *** DEBUG LOG: ก่อนการอัปเดต ***
        console.log(`[DEBUG - approvalModel] Before update: Detail ID: ${request_detail_id}, Old Approval Status: ${oldApprovalStatus}, New Approval Status: ${newApprovalStatus}, Old Approved Qty: ${oldApprovedQty}, New Approved Qty: ${newApprovedQty}, Intended New Processing Status: ${newProcessingStatusForUpdate}`);

        // 3. อัปเดต approval_status, approved_qty, request_detail_note และ processing_status
        let query, params;
        const hasApprovalStatusOrQtyChanged = (oldApprovalStatus !== newApprovalStatus) || (oldApprovedQty !== newApprovedQty);
        const hasProcessingStatusChanged = (oldProcessingStatus !== newProcessingStatusForUpdate);

        // เราจะอัปเดต processing_status เสมอในฟังก์ชันนี้ตาม logic การอนุมัติ/ปฏิเสธ
        // เนื่องจากสถานะนี้ถูกควบคุมโดยการอนุมัติ
        if (note) {
            query = `
                UPDATE request_details
                SET approval_status = $1, approved_qty = $2, request_detail_note = $3, processing_status = $4, updated_at = NOW()
                WHERE request_detail_id = $5
            `;
            params = [newApprovalStatus, newApprovedQty, note, newProcessingStatusForUpdate, request_detail_id];
        } else {
            query = `
                UPDATE request_details
                SET approval_status = $1, approved_qty = $2, request_detail_note = NULL, processing_status = $3, updated_at = NOW()
                WHERE request_detail_id = $4
            `;
            params = [newApprovalStatus, newApprovedQty, newProcessingStatusForUpdate, request_detail_id];
        }
        const result = await client.query(query, params);

        // *** DEBUG LOG: หลังการอัปเดตใน DB (ดึงค่าจาก DB อีกครั้งเพื่อยืนยัน) ***
        const verificationResult = await client.query(
            `SELECT approval_status, approved_qty, processing_status FROM request_details WHERE request_detail_id = $1`,
            [request_detail_id]
        );
        console.log(`[DEBUG - approvalModel] After update in DB: Detail ID: ${request_detail_id}, Current Approval Status: ${verificationResult.rows[0]?.approval_status}, Current Approved Qty: ${verificationResult.rows[0]?.approved_qty}, Current Processing Status: ${verificationResult.rows[0]?.processing_status}`);

        // 4. บันทึกประวัติสถานะการอนุมัติของรายการย่อย
        if (result.rowCount > 0 && hasApprovalStatusOrQtyChanged) { // บันทึกเฉพาะถ้าสถานะอนุมัติหรือจำนวนมีการเปลี่ยนแปลง
            await client.query(
                `INSERT INTO request_status_history
                 (request_id, request_detail_id, old_status, new_status, changed_by, changed_at, note, status_type, old_approved_qty, new_approved_qty)
                 VALUES ($1, $2, $3, $4, $5, NOW(), $6, 'approval_detail', $7, $8)`,
                [request_id_from_detail, request_detail_id, oldApprovalStatus, newApprovalStatus, changed_by, note || `อัปเดตสถานะอนุมัติรายการย่อย ID: ${request_detail_id}`, oldApprovedQty, newApprovedQty]
            );
        }

        // 5. บันทึกประวัติ processing_status ถ้ามีการเปลี่ยนแปลง
        // ควรบันทึกเป็น 'processing_detail' type หรือคล้ายกัน
        if (result.rowCount > 0 && hasProcessingStatusChanged) {
            await client.query(
                `INSERT INTO request_status_history
                 (request_id, request_detail_id, old_status, new_status, changed_by, changed_at, note, status_type)
                 VALUES ($1, $2, $3, $4, $5, NOW(), $6, 'processing_detail')`,
                [request_id_from_detail, request_detail_id, oldProcessingStatus, newProcessingStatusForUpdate, changed_by, `เปลี่ยนสถานะการประมวลผลรายการย่อยเป็น: ${newProcessingStatusForUpdate}`]
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
 * @returns {object} Object ที่มีจำนวน approved, rejected, waiting และ total ของรายการย่อย
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

        // 2. คำนวณสถานะใหม่จากรายการย่อย (เฉพาะ approval_status)
        const { total, approvedCount, rejectedCount, waitingCount } = await exports.calculateOverallApprovalStatus(request_id);

        // 3. กำหนด finalOverallStatus ตามผลการนับ
        let finalOverallStatus;

        if (total === 0) {
            finalOverallStatus = 'waiting_approval'; // อาจจะไม่มีรายการย่อยเลย หรือเป็นสถานะเริ่มต้น
        } else if (approvedCount === total) {
            finalOverallStatus = 'approved_all';
        } else if (rejectedCount === total) {
            finalOverallStatus = 'rejected_all';
        } else if (approvedCount > 0 && rejectedCount > 0) {
            finalOverallStatus = 'approved_partial_and_rejected_partial';
        } else if (approvedCount > 0) {
            finalOverallStatus = 'approved_partial';
        } else if (rejectedCount > 0) {
            finalOverallStatus = 'rejected_partial';
        } else if (waitingCount > 0) {
            finalOverallStatus = 'waiting_approval';
        } else {
            finalOverallStatus = 'unknown_status'; // ควรจัดการเคสนี้ให้ดี หรือไม่ควรเกิดขึ้น
        }

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

// Export the functions for use in controllers
module.exports = {
    getRequestForApproval: exports.getRequestForApproval,
    getRequestDetails: exports.getRequestDetails,
    updateRequestOverallStatus: exports.updateRequestOverallStatus,
    updateRequestDetailApprovalStatus: exports.updateRequestDetailApprovalStatus,
    calculateOverallApprovalStatus: exports.calculateOverallApprovalStatus,
    updateRequestOverallStatusByDetails: exports.updateRequestOverallStatusByDetails,
};