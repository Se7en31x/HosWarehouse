const { pool } = require('../config/db'); // ตรวจสอบ path ของ db.js ให้ถูกต้อง

const TransactionHistory = {
    // ฟังก์ชัน createHistory (สำหรับบันทึกประวัติใหม่)
    async create(data) {
        const { request_id, changed_by, old_status, new_status, note, status_type, request_detail_id } = data;
        const changed_at = new Date(); // **ปรับปรุง: เพิ่มการสร้าง timestamp ปัจจุบัน**
        console.log(`Creating history for request ${request_id}: from ${old_status} to ${new_status} by user ${changed_by} at ${changed_at.toISOString()}`);
        
        const res = await pool.query(
            `INSERT INTO request_status_history
            (request_id, changed_by, old_status, new_status, note, status_type, request_detail_id, changed_at) -- **ปรับปรุง: เพิ่ม changed_at ในคอลัมน์**
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) -- **ปรับปรุง: เพิ่ม $8 สำหรับ changed_at**
            RETURNING *`,
            [request_id, changed_by, old_status, new_status, note, status_type, request_detail_id, changed_at] // **ปรับปรุง: เพิ่ม changed_at ใน parameters**
        );
        return res.rows[0];
    },

    // ฟังก์ชันหลักสำหรับดึงประวัติทั้งหมดพร้อม Filter, Search, Sort, Pagination
    async getAllFilteredLogs({ page, limit, status, search, sort, order }) {
        let query = `
            SELECT
                th.history_id,
                th.request_id,
                r.request_code,          -- ดึง request_code จากตาราง requests
                th.old_status,
                th.new_status,
                th.changed_by,
                th.changed_at,           -- ใช้ changed_at จาก request_status_history
                th.note,
                th.status_type,
                th.request_detail_id,
                u.user_id,
                u.user_name,
                u.user_fname,
                u.user_lname
            FROM request_status_history th
            LEFT JOIN users u ON th.changed_by = u.user_id
            LEFT JOIN requests r ON th.request_id = r.request_id -- **ปรับปรุง: เพิ่ม JOIN ตาราง requests**
            WHERE 1=1
        `;
        let countQuery = `
            SELECT COUNT(*)
            FROM request_status_history th
            LEFT JOIN users u ON th.changed_by = u.user_id
            LEFT JOIN requests r ON th.request_id = r.request_id -- **ปรับปรุง: เพิ่ม JOIN ตาราง requests**
            WHERE 1=1
        `;
        const queryParams = [];
        const countQueryParams = [];
        let paramIndex = 1;

        // Filter by status (กรองจาก new_status)
        if (status) {
            query += ` AND th.new_status = $${paramIndex}`;
            countQuery += ` AND th.new_status = $${paramIndex}`;
            queryParams.push(status);
            countQueryParams.push(status);
            paramIndex++;
        }

        // Search term (ค้นหาจาก request_id, note, user_name, user_fname, user_lname, request_code)
        if (search) {
            const searchTermLower = `%${search.toLowerCase()}%`;
            query += ` AND (
                LOWER(CAST(th.request_id AS TEXT)) LIKE $${paramIndex} OR
                LOWER(r.request_code) LIKE $${paramIndex} OR -- **ปรับปรุง: เพิ่มค้นหาด้วย request_code**
                LOWER(th.note) LIKE $${paramIndex} OR
                LOWER(u.user_name) LIKE $${paramIndex} OR
                LOWER(u.user_fname) LIKE $${paramIndex} OR
                LOWER(u.user_lname) LIKE $${paramIndex}
            )`;
            countQuery += ` AND (
                LOWER(CAST(th.request_id AS TEXT)) LIKE $${paramIndex} OR
                LOWER(r.request_code) LIKE $${paramIndex} OR -- **ปรับปรุง: เพิ่มค้นหาด้วย request_code**
                LOWER(th.note) LIKE $${paramIndex} OR
                LOWER(u.user_name) LIKE $${paramIndex} OR
                LOWER(u.user_fname) LIKE $${paramIndex} OR
                LOWER(u.user_lname) LIKE $${paramIndex}
            )`;
            queryParams.push(searchTermLower);
            countQueryParams.push(searchTermLower);
            paramIndex++;
        }

        // Sorting
        const validSortColumns = ['changed_at', 'request_id', 'request_code', 'changed_by', 'new_status']; // **ปรับปรุง: เพิ่ม request_code ใน validSortColumns**
        const finalSortColumn = validSortColumns.includes(sort) ? sort : 'changed_at'; // Default sort by changed_at
        const finalSortOrder = (order && order.toLowerCase() === 'asc') ? 'ASC' : 'DESC';

        query += ` ORDER BY ${finalSortColumn} ${finalSortOrder}`;

        // Pagination
        const offset = (page - 1) * limit;
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        queryParams.push(limit, offset);

        console.log('Executing history query:', query, queryParams);

        try {
            const [logsRes, countRes] = await Promise.all([
                pool.query(query, queryParams),
                pool.query(countQuery, countQueryParams)
            ]);

            const totalCount = parseInt(countRes.rows[0].count, 10);
            const totalPages = Math.ceil(totalCount / limit);

            return {
                logs: logsRes.rows,
                totalCount,
                totalPages,
                currentPage: page,
            };
        } catch (err) {
            console.error('Error fetching filtered transaction logs:', err);
            throw err;
        }
    },

    // ฟังก์ชันอื่นๆ ที่อาจไม่เกี่ยวข้องกับหน้านี้โดยตรง แต่ยังคงไว้หากใช้งาน
    async getAll() {
        console.log('Fetching all histories from request_status_history');
        const res = await pool.query('SELECT * FROM request_status_history ORDER BY changed_at DESC');
        return res.rows;
    },

    async getByTransactionId(request_id) { // เปลี่ยนชื่อ parameter เป็น request_id เพื่อความชัดเจน
        console.log(`Fetching history by request ID: ${request_id}`);
        const res = await pool.query(
            'SELECT * FROM request_status_history WHERE request_id = $1 ORDER BY changed_at DESC',
            [request_id]
        );
        return res.rows;
    },
};

module.exports = TransactionHistory;