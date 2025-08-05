const { pool } = require('../config/db');

const TransactionHistory = {
    /**
     * ดึงประวัติการทำรายการทั้งหมดจากหลายตาราง (Requests, Imports, Borrow Returns, Stock Movements)
     * พร้อมรองรับการ Filter, Search, Sort, และ Pagination
     */
    async getAllFilteredLogs({ page, limit, type, search, sort_by, sort_order }) {
        let queryParams = [];
        let paramIndex = 1;

        const baseQuery = `
            WITH unified_logs AS (
                -- 1. Logs จาก Request Status History ที่เป็น 'request_overall' (การสร้างคำขอโดยรวม)
                SELECT
                    'h-' || rsh.history_id AS id,
                    'request_created' AS source_table,
                    CASE
                        WHEN r.request_type = 'withdraw' THEN 'เบิก'
                        WHEN r.request_type = 'borrow' THEN 'ยืม'
                        ELSE r.request_type
                    END AS type,
                    rsh.changed_at AS timestamp,
                    r.request_code,
                    rsh.note,
                    u.user_fname || ' ' || u.user_lname AS user_name,
                    rsh.history_id AS unique_id,
                    r.request_id,
                    rsh.old_status,
                    rsh.new_status
                FROM request_status_history rsh
                JOIN requests r ON rsh.request_id = r.request_id
                LEFT JOIN users u ON rsh.changed_by = u.user_id
                WHERE rsh.status_type = 'request_overall'

                UNION ALL

                -- 2. Logs จาก Imports (นำเข้า)
                SELECT
                    'imp-' || i.import_id AS id,
                    'import' AS source_table,
                    'เพิ่ม/นำเข้า' AS type,
                    i.import_date AS timestamp,
                    NULL AS request_code,
                    i.import_note AS note,
                    u.user_fname || ' ' || u.user_lname AS user_name,
                    i.import_id AS unique_id,
                    NULL AS request_id,
                    NULL AS old_status,
                    NULL AS new_status
                FROM imports i
                LEFT JOIN users u ON i.user_id = u.user_id

                UNION ALL

                -- 3. Logs จาก Borrow Returns (คืน)
                SELECT
                    'ret-' || br.return_id AS id,
                    'borrow_return' AS source_table,
                    'คืน' AS type,
                    br.return_date AS timestamp,
                    NULL AS request_code,
                    br.return_note AS note,
                    u.user_fname || ' ' || u.user_lname AS user_name,
                    br.return_id AS unique_id,
                    NULL AS request_id,
                    NULL AS old_status,
                    NULL AS new_status
                FROM borrow_returns br
                LEFT JOIN users u ON br.inspected_by = u.user_id

                UNION ALL

                -- 4. Logs จาก Stock Movements (ปรับปรุงสต็อก, โอนย้าย, ยกเลิก/ชำรุด)
                SELECT
                    'move-' || sm.move_id AS id,
                    'stock_movement' AS source_table,
                    CASE
                        WHEN sm.move_type = 'ปรับปรุง' THEN 'ปรับปรุงสต็อก'
                        WHEN sm.move_type = 'โอนย้าย' THEN 'โอนย้าย'
                        WHEN sm.move_type = 'ยกเลิก/ชำรุด' THEN 'ยกเลิก/ชำรุด'
                        ELSE sm.move_type
                    END AS type,
                    sm.move_date AS timestamp,
                    NULL AS request_code,
                    sm.note,
                    u.user_fname || ' ' || u.user_lname AS user_name,
                    sm.move_id AS unique_id,
                    NULL AS request_id,
                    NULL AS old_status,
                    NULL AS new_status
                FROM stock_movements sm
                LEFT JOIN users u ON sm.user_id = u.user_id
            )
        `;

        let whereClause = '';
        let queryParamsCount = [];
        if (type) {
            whereClause += ` AND type = $${paramIndex++}`;
            queryParams.push(type);
        }

        if (search) {
            const searchTermLower = `%${search.toLowerCase()}%`;
            whereClause += ` AND LOWER(user_name) LIKE $${paramIndex++}`;
            queryParams.push(searchTermLower);
        }

        queryParamsCount = [...queryParams];
        
        const countQuery = `
            ${baseQuery}
            SELECT COUNT(*) FROM unified_logs WHERE 1=1 ${whereClause};
        `;

        const validSortColumns = ['timestamp', 'type', 'user_name', 'note'];
        const finalSortColumn = validSortColumns.includes(sort_by) ? sort_by : 'timestamp';
        const finalSortOrder = (sort_order && sort_order.toLowerCase() === 'asc') ? 'ASC' : 'DESC';

        const offset = (page - 1) * limit;

        const finalQuery = `
            ${baseQuery}
            SELECT * FROM unified_logs
            WHERE 1=1 ${whereClause}
            ORDER BY "${finalSortColumn}" ${finalSortOrder}
            LIMIT $${paramIndex++} OFFSET $${paramIndex++};
        `;
        queryParams.push(limit, offset);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const countResult = await client.query(countQuery, queryParamsCount);
            const totalCount = parseInt(countResult.rows[0].count, 10);
            const totalPages = Math.ceil(totalCount / limit);

            const result = await client.query(finalQuery, queryParams);
            const logs = result.rows;
            
            const detailedLogs = await Promise.all(logs.map(async (log) => {
                let details = [];
                switch (log.source_table) {
                    case 'request_created':
                        if (log.request_id) {
                            details = (await client.query(`
                                SELECT rd.item_id, rd.requested_qty, rd.approved_qty, rd.approval_status,
                                       i.item_name, i.item_unit, rd.request_detail_note,
                                       rd.request_detail_type, rd.expected_return_date
                                FROM request_details rd
                                JOIN items i ON rd.item_id = i.item_id
                                WHERE rd.request_id = $1`, [log.request_id])).rows;
                        }
                        break;
                    case 'import':
                        details = (await client.query(`
                            SELECT id.*, i.item_name, i.item_unit
                            FROM import_details id
                            JOIN items i ON id.item_id = i.item_id
                            WHERE id.import_id = $1`, [log.unique_id])).rows;
                        break;
                    case 'borrow_return':
                        details = (await client.query(`
                            SELECT br.return_qty, br.return_note, br.return_status,
                                   i.item_name, i.item_unit
                            FROM borrow_returns br
                            JOIN request_details rd ON br.request_detail_id = rd.request_detail_id
                            JOIN items i ON rd.item_id = i.item_id
                            WHERE br.return_id = $1
                        `, [log.unique_id])).rows;
                        break;
                    case 'stock_movement':
                        details = (await client.query(`
                            SELECT sm.*, i.item_name, i.item_unit
                            FROM stock_movements sm
                            JOIN items i ON sm.item_id = i.item_id
                            WHERE sm.move_id = $1
                        `, [log.unique_id])).rows;
                        break;
                    default:
                        details = [];
                }
                return {
                    ...log,
                    details: details,
                };
            }));
            await client.query('COMMIT');

            return {
                logs: detailedLogs,
                totalCount,
                totalPages,
                currentPage: page,
            };

        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Error fetching combined history logs:', err);
            throw err;
        } finally {
            client.release();
        }
    },
};

module.exports = TransactionHistory;