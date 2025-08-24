const { pool } = require('../config/db');
const moment = require('moment-timezone');

class RequestStatusModel {
    /**
     * ดึงข้อมูลคำขอและรายละเอียดทั้งหมดสำหรับ request_id ที่ระบุ
     */
    static async getRequestDetails(requestId) {
        try {
            const requestQuery = `
                SELECT
                    r.request_id,
                    r.request_code,
                    r.request_date,
                    r.request_status,
                    r.request_note,
                    r.request_type,
                    r.request_due_date,
                    r.is_urgent,
                    r.updated_at,
                    u.user_fname || ' ' || u.user_lname AS user_name,
                    -- ✅ รวม summary โดยนับเฉพาะที่อนุมัติแล้ว
                    COUNT(rd.request_detail_id) FILTER (WHERE rd.approval_status = 'approved')::int AS total_details,
                    COALESCE(SUM(CASE WHEN rd.processing_status = 'completed' AND rd.approval_status = 'approved' THEN 1 ELSE 0 END),0)::int AS completed_details
                FROM requests r
                JOIN users u ON r.user_id = u.user_id
                LEFT JOIN request_details rd ON r.request_id = rd.request_id
                WHERE r.request_id = $1
                GROUP BY r.request_id, u.user_fname, u.user_lname;
            `;
            const requestResult = await pool.query(requestQuery, [requestId]);
            const request = requestResult.rows[0];
            if (!request) {
                return null;
            }

            // ✅ คำนวณ processing_summary เช่น 1/5
            request.processing_summary = `${request.completed_details}/${request.total_details}`;

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
                FROM request_details rd
                JOIN items i ON rd.item_id = i.item_id
                WHERE rd.request_id = $1
                ORDER BY rd.request_detail_id ASC;
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
                  r.request_type,
                  r.updated_at,
                  r.request_due_date,
                  u.user_fname || ' ' || u.user_lname AS user_name,
                  u.department,
                  COUNT(rd.request_detail_id) FILTER (WHERE rd.approval_status = 'approved')::int AS total_details,
                  COALESCE(SUM(CASE WHEN rd.processing_status = 'completed' AND rd.approval_status = 'approved' THEN 1 ELSE 0 END), 0)::int AS completed_details
              FROM requests r
              JOIN users u ON r.user_id = u.user_id
              LEFT JOIN request_details rd ON r.request_id = rd.request_id
            `;
            const values = [];
            if (allowedStatuses && allowedStatuses.length > 0) {
                query += ` WHERE r.request_status = ANY($1)`;
                values.push(allowedStatuses);
            }
            query += `
              GROUP BY r.request_id, r.request_type, u.user_fname, u.user_lname, u.department
              ORDER BY r.request_date DESC
            `;

            const result = await client.query(query, values);

            const rows = result.rows.map(row => ({
                ...row,
                processing_summary: `${row.completed_details}/${row.total_details}`,
            }));

            return rows;
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
     */
    static async updateProcessingStatusbatch(requestId, updates, changedByUserId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const now = moment().tz('Asia/Bangkok').format('YYYY-MM-DD HH:mm:ss.SSSSSSZ');

            for (const update of updates) {
                const { request_detail_id, newStatus, current_approval_status } = update;

                const oldDetailResult = await client.query(
                    `SELECT processing_status FROM request_details WHERE request_detail_id = $1 FOR UPDATE`,
                    [request_detail_id]
                );
                const oldProcessingStatus = oldDetailResult.rows[0]?.processing_status || null;

                // ตรวจสอบว่า approval status ต้องเป็น 'approved' ก่อน
                if (current_approval_status === 'approved') {
                    const updateDetailQuery = `
                        UPDATE request_details
                        SET processing_status = $1, 
                            updated_at = $2,
                            borrow_status = CASE 
                                WHEN request_detail_type = 'borrow' AND $1 = 'completed' THEN 'borrowed'
                                ELSE borrow_status
                            END
                        WHERE request_detail_id = $3 
                          AND approval_status = 'approved';
                    `;
                    const updateResult = await client.query(updateDetailQuery, [newStatus, now, request_detail_id]);

                    if (updateResult.rowCount > 0 && oldProcessingStatus !== newStatus) {
                        // บันทึกประวัติการเปลี่ยนแปลง
                        const insertHistoryQuery = `
                            INSERT INTO request_status_history (
                                request_id,
                                request_detail_id,
                                changed_by,
                                changed_at,
                                history_type,
                                old_value_type,
                                old_value,
                                new_value
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
                        `;
                        await client.query(insertHistoryQuery, [
                            requestId,
                            request_detail_id,
                            changedByUserId,
                            now,
                            'processing_status_change',
                            'processing_status',
                            oldProcessingStatus,
                            newStatus
                        ]);
                    }
                } else {
                    console.warn(`Request detail ID ${request_detail_id} with approval status "${current_approval_status}" cannot update processing_status. Skipping.`);
                }
            }

            await client.query(
                `UPDATE requests SET updated_at = $1, updated_by = $2 WHERE request_id = $3`,
                [now, changedByUserId, requestId]
            );

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error in RequestStatusModel.updateProcessingStatusbatch:', error);
            throw error;
        } finally {
            client.release();
        }
    }

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
            stock_cut: 'ตัดสต็อกแล้ว',
            approved_in_queue: 'อยู่ในคิวจัดเตรียม'
        };
        return map[status] || status;
    }
}

module.exports = RequestStatusModel;
