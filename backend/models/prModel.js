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

// ✅ ปรับปรุง: เพิ่มคอลัมน์ 'item_max' และแก้ไข ORDER BY เพื่อให้แสดงรายการที่ควรซื้อก่อน
const getAllItems = async () => {
    const query = `
        SELECT 
            i.item_id, 
            i.item_name, 
            i.item_unit, 
            i.item_purchase_unit,
            i.item_conversion_rate,
            i.item_min,
            i.item_max,
            COALESCE(SUM(il.qty_remaining), 0) as current_stock
        FROM "items" AS i
        LEFT JOIN "item_lots" AS il ON i.item_id = il.item_id
        WHERE i.is_deleted = false
        GROUP BY i.item_id
        ORDER BY 
            CASE 
                WHEN COALESCE(SUM(il.qty_remaining), 0) <= i.item_min THEN 0
                ELSE 1
            END,
            (COALESCE(SUM(il.qty_remaining), 0) - i.item_min) ASC,
            i.item_name ASC;
    `;
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

// ✅ ปรับปรุง: แก้ไขคำสั่ง SQL เพื่อไม่ให้เรียกใช้ Aggregate Function ซ้อนกัน
const getPurchaseRequestById = async (prId) => {
    const query = `
        SELECT 
            ph.pr_id,
            ph.pr_no,
            CONCAT(u.user_fname, ' ', u.user_lname) AS requester_name,
            ph.status,
            ph.created_at,
            (
                SELECT json_agg(
                    jsonb_build_object(
                        'pr_detail_id', pd.pr_detail_id,
                        'item_id', pd.item_id,
                        'item_name', i.item_name,
                        'item_unit', i.item_unit,
                        'item_purchase_unit', i.item_purchase_unit,
                        'requested_qty', pd.qty,
                        'purchase_unit', pd.unit,
                        'note', pd.note,
                        'current_stock', stock.current_stock
                    )
                )
                FROM "pr_detail" AS pd
                JOIN "items" AS i ON pd.item_id = i.item_id
                LEFT JOIN (
                    -- Subquery เพื่อคำนวณ stock คงเหลือของแต่ละ item_id
                    SELECT item_id, COALESCE(SUM(qty_remaining), 0) AS current_stock
                    FROM "item_lots"
                    GROUP BY item_id
                ) AS stock ON i.item_id = stock.item_id
                WHERE pd.pr_id = ph.pr_id
            ) AS items
        FROM "pr_header" AS ph
        JOIN "users" AS u ON ph.requester_id = u.user_id
        WHERE ph.pr_id = $1
        GROUP BY ph.pr_id, u.user_fname, u.user_lname;
    `;
    const result = await pool.query(query, [prId]);
    return result.rows[0] || null;
};

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
    updatePrStatus
};