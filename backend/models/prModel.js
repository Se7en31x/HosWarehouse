// models/prModel.js
const { pool } = require('../config/db');

// ฟังก์ชันสำหรับสร้างเลขที่ PR
const generatePrNo = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const sequence = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PR-${year}${month}-${sequence}`;
};

// ฟังก์ชันสำหรับบันทึกคำขอซื้อ
const createPurchaseRequest = async (requester_id, items_to_purchase) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const prNo = generatePrNo();
        const prHeaderQuery = `
            INSERT INTO "pr_header" (pr_no, requester_id, status, created_at, updated_at)
            VALUES ($1, $2, $3, NOW(), NOW())
            RETURNING pr_id;
        `;
        const statusValue = 'submitted'; 
        const prHeaderResult = await client.query(prHeaderQuery, [prNo, requester_id, statusValue]);
        const pr_id = prHeaderResult.rows[0].pr_id;

        for (const item of items_to_purchase) {
            const prDetailQuery = `
                INSERT INTO "pr_detail" (pr_id, item_id, qty, unit, note)
                VALUES ($1, $2, $3, $4, $5);
            `;
            const prDetailValues = [pr_id, item.item_id, item.qty, item.unit, item.note];
            await client.query(prDetailQuery, prDetailValues);
        }

        await client.query('COMMIT');
        return { success: true, pr_id, pr_no: prNo };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// ฟังก์ชันสำหรับดึงรายการสินค้าจากตาราง items
const getAllItems = async () => {
    const query = `SELECT item_id, item_name, item_unit FROM "items" WHERE is_deleted = false ORDER BY item_name;`;
    const result = await pool.query(query);
    return result.rows;
};

// ฟังก์ชันสำหรับดึงรายการคำขอซื้อทั้งหมดพร้อมชื่อผู้ร้องขอ
const getAllPurchaseRequests = async () => {
    const query = `
        SELECT 
            ph.pr_id, 
            ph.pr_no, 
            ph.status, 
            ph.created_at,
            CONCAT(u.user_fname, ' ', u.user_lname) AS requester_name
        FROM "pr_header" AS ph
        JOIN "users" AS u 
        ON ph.requester_id = u.user_id
        ORDER BY ph.created_at DESC;
    `;
    const result = await pool.query(query);
    return result.rows;
};

// ฟังก์ชันสำหรับดึงรายละเอียดคำขอซื้อตาม ID
const getPurchaseRequestById = async (prId) => {
    const query = `
        SELECT 
            ph.pr_id,
            ph.pr_no,
            CONCAT(u.user_fname, ' ', u.user_lname) AS requester_name,
            ph.status,
            ph.created_at,
            (SELECT json_agg(
                jsonb_build_object(
                    'item_id', pd.item_id,
                    'item_name', i.item_name,
                    'item_unit', i.item_unit,
                    'requested_qty', pd.qty,
                    'purchase_unit', pd.unit,
                    'note', pd.note
                )
            )
            FROM "pr_detail" AS pd
            JOIN "items" AS i ON pd.item_id = i.item_id
            WHERE pd.pr_id = ph.pr_id) AS items
        FROM "pr_header" AS ph
        JOIN "users" AS u ON ph.requester_id = u.user_id
        WHERE ph.pr_id = $1;
    `;
    const result = await pool.query(query, [prId]);
    return result.rows[0] || null;
};

// ✅ ฟังก์ชันใหม่: อัปเดตสถานะ PR
const updatePrStatus = async (prId, newStatus) => {
    const query = `
        UPDATE "pr_header"
        SET status = $1, updated_at = NOW()
        WHERE pr_id = $2
        RETURNING *;
    `;
    const result = await pool.query(query, [newStatus, prId]);
    return result.rows[0];
};

module.exports = {
    createPurchaseRequest,
    getAllItems,
    getAllPurchaseRequests,
    getPurchaseRequestById,
    updatePrStatus // ✅ Export ฟังก์ชันใหม่
};