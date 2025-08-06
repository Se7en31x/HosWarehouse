// models/requestStatusModel.js
const { pool } = require('../config/db');
const moment = require('moment-timezone');

class RequestStatusModel {
    /**
     * ดึงข้อมูลคำขอและรายละเอียดทั้งหมดสำหรับ request_id ที่ระบุ
     * รวมถึงข้อมูลผู้ใช้ (user_name) และข้อมูลไอเทม (item_name, item_unit)
     *
     * @param {number} requestId - ID ของคำขอที่ต้องการดึงข้อมูล
     * @returns {Promise<Object|null>} - อ็อบเจกต์ที่มี request และ details หรือ null หากไม่พบคำขอ
     */
    static async getRequestDetails(requestId) {
        try {
            const requestQuery = `
                SELECT
                    r.request_id,
                    r.request_code,
                    r.request_date,
                    r.request_status,
                    r.overall_processing_status,
                    r.request_note,
                    r.request_type,
                    r.request_due_date,
                    r.is_urgent,
                    r.updated_at,
                    u.user_fname || ' ' || u.user_lname AS user_name -- รวมชื่อจริงและนามสกุล
                FROM
                    requests r
                JOIN
                    users u ON r.user_id = u.user_id
                WHERE
                    r.request_id = $1;
            `;
            const requestResult = await pool.query(requestQuery, [requestId]);
            const request = requestResult.rows[0];
            if (!request) {
                return null;
            }
            const detailsQuery = `
                SELECT
                    rd.request_detail_id,
                    rd.request_id,
                    rd.item_id,
                    rd.requested_qty,
                    rd.approved_qty,
                    rd.approval_status,
                    rd.request_detail_note,
                    rd.request_detail_type,
                    rd.updated_at,
                    rd.processing_status,
                    rd.expected_return_date,
                    i.item_name,
                    i.item_unit
                FROM
                    request_details rd
                JOIN
                    items i ON rd.item_id = i.item_id
                WHERE
                    rd.request_id = $1
                ORDER BY
                    rd.request_detail_id ASC;
            `;
            const detailsResult = await pool.query(detailsQuery, [requestId]);
            const details = detailsResult.rows;
            return { request, details };
        } catch (error) {
            console.error('Error fetching request details from DB:', error);
            throw error;
        }
    }

    /**
     * ดึงรายการคำขอทั้งหมด หรือกรองตามสถานะที่ระบุ
     * @param {Array<string>} allowedStatuses - อาร์เรย์ของสถานะที่ต้องการกรอง
     * @returns {Promise<Array>} - อาร์เรย์ของคำขอ
     */
    static async getRequestsByStatuses(allowedStatuses) {
        const client = await pool.connect();
        try {
            let query = `
                SELECT
                    r.request_id,
                    r.request_code,
                    r.request_date,
                    r.request_status,
                    r.updated_at,
                    r.request_due_date,
                    u.user_fname || ' ' || u.user_lname AS user_name,
                    u.department
                FROM
                    requests r
                JOIN
                    users u ON r.user_id = u.user_id
            `;
            const values = [];
            if (allowedStatuses && allowedStatuses.length > 0) {
                query += ` WHERE r.request_status = ANY($1)`;
                values.push(allowedStatuses);
            }
            query += ` ORDER BY r.request_date DESC`;
            const result = await client.query(query, values);
            return result.rows;
        } catch (error) {
            console.error('Error in getRequestsByStatuses:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * อัปเดตสถานะการดำเนินการของรายการคำขอหลายรายการแบบ Batch
     * และบันทึกประวัติการเปลี่ยนแปลงลงใน request_status_history
     *
     * @param {number} requestId - ID ของคำขอหลัก
     * @param {Array<Object>} updates - อาร์เรย์ของอ็อบเจกต์ที่ระบุการอัปเดตแต่ละรายการ
     * ตัวอย่าง: [{ request_detail_id: 1, newStatus: 'preparing', current_approval_status: 'approved' }]
     * @param {string} newOverallProcessingStatus - สถานะการดำเนินการรวมใหม่ของคำขอหลัก
     * @param {number} changedByUserId - ID ของผู้ใช้ที่ทำการเปลี่ยนแปลง (มาจาก Frontend)
     * @returns {Promise<void>}
     */
    static async updateProcessingStatusbatch(requestId, updates, newOverallProcessingStatus, changedByUserId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const now = moment().tz('Asia/Bangkok').format('YYYY-MM-DD HH:mm:ss.SSSSSSZ');
            for (const update of updates) {
                const { request_detail_id, newStatus, current_approval_status } = update;
                const oldDetailResult = await client.query(
                    `SELECT processing_status, item_id FROM request_details WHERE request_detail_id = $1`,
                    [request_detail_id]
                );
                const oldProcessingStatus = oldDetailResult.rows[0]?.processing_status || null;
                const itemId = oldDetailResult.rows[0]?.item_id;
                let itemName = `รายการ ID: ${request_detail_id}`;
                if (itemId) {
                    const itemResult = await client.query(
                        `SELECT item_name FROM items WHERE item_id = $1`,
                        [itemId]
                    );
                    itemName = itemResult.rows[0]?.item_name || itemName;
                }
                if (current_approval_status === 'approved') {
                    const updateDetailQuery = `
                        UPDATE request_details
                        SET
                            processing_status = $1,
                            updated_at = $2
                        WHERE
                            request_detail_id = $3;
                    `;
                    await client.query(updateDetailQuery, [newStatus, now, request_detail_id]);
                    const description = `Updated processing status for "${itemName}" from "${this.translateStatus(oldProcessingStatus)}" to "${this.translateStatus(newStatus)}"`;
                    const insertHistoryQuery = `
                        INSERT INTO request_status_history (
                            request_id,
                            request_detail_id,
                            old_processing_status,
                            new_processing_status,
                            changed_by,
                            changed_at,
                            status_type,
                            action,
                            description
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
                    `;
                    await client.query(insertHistoryQuery, [
                        requestId,
                        request_detail_id,
                        oldProcessingStatus,
                        newStatus,
                        changedByUserId,
                        now,
                        'PROCESSING',
                        'UPDATE_PROCESSING_STATUS',
                        description
                    ]);
                } else {
                    console.warn(`Request detail ID ${request_detail_id} with approval status "${current_approval_status}" cannot have its processing_status updated. Skipping history log.`);
                }
            }
            const updateRequestQuery = `
                UPDATE requests
                SET
                    overall_processing_status = $1,
                    updated_at = $2,
                    updated_by = $3
                WHERE
                    request_id = $4;
            `;
            await client.query(updateRequestQuery, [newOverallProcessingStatus, now, changedByUserId, requestId]);
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error in RequestStatusModel.updateProcessingStatusbatch:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // เพิ่มฟังก์ชันใหม่นี้
        static async updateOverallProcessingStatus(requestId, newOverallProcessingStatus, changedByUserId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const now = moment().tz('Asia/Bangkok').format('YYYY-MM-DD HH:mm:ss.SSSSSSZ');
            const updateRequestQuery = `
                UPDATE requests
                SET
                    overall_processing_status = $1,
                    updated_at = $2,
                    updated_by = $3
                WHERE
                    request_id = $4;
            `;
            await client.query(updateRequestQuery, [newOverallProcessingStatus, now, changedByUserId, requestId]);

            const description = `Updated overall processing status from an unspecified status to "${this.translateStatus(newOverallProcessingStatus)}"`;
            const insertHistoryQuery = `
                INSERT INTO request_status_history (
                    request_id,
                    changed_by,
                    changed_at,
                    status_type,
                    action,
                    description
                ) VALUES ($1, $2, $3, $4, $5, $6);
            `;
            await client.query(insertHistoryQuery, [
                requestId,
                changedByUserId,
                now,
                // เปลี่ยน 'OVERALL_PROCESSING' เป็น 'PROCESSING'
                'PROCESSING',
                'UPDATE_OVERALL_PROCESSING_STATUS',
                description
            ]);

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error in RequestStatusModel.updateOverallProcessingStatus:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Helper function สำหรับ translateStatus ใน Backend
    static translateStatus(status) {
        const map = {
            pending: 'รอดำเนินการ',
            preparing: 'กำลังจัดเตรียม',
            delivering: 'อยู่ระหว่างการนำส่ง',
            completed: 'เสร็จสิ้น',
            approved: 'อนุมัติแล้ว',
            rejected: 'ปฏิเสธแล้ว',
            waiting_approval_detail: 'รออนุมัติ',
            approved_all: 'อนุมัติทั้งหมดแล้ว',
            approved_partial: 'อนุมัติบางส่วน',
            waiting_approval: 'รอการอนุมัติ',
            rejected_all: 'ปฏิเสธทั้งหมดแล้ว',
            rejected_partial: 'ปฏิเสธบางส่วน',
            approved_partial_and_rejected_partial: 'อนุมัติและปฏิเสธบางส่วน',
            canceled: 'ยกเลิกคำขอ',
            unknown_status: 'สถานะไม่ทราบ',
            '': 'ไม่ระบุ',
            'N/A': 'N/A',
            null: 'ยังไม่ระบุ',
            'waiting_for_processing_selection': 'รอการเลือกสถานะ',
            'no_approved_for_processing': 'ยังไม่มีรายการที่อนุมัติ',
            'unknown_processing_state': 'สถานะดำเนินการไม่ทราบ',
            'partially_processed': 'กำลังดำเนินการบางส่วน',
        };
        return map[status] || status;
    }
}
module.exports = RequestStatusModel;