// models/rfqModel.js
const { pool } = require('../config/db');

const generateRfqNo = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const sequence = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `RFQ-${year}${month}${day}-${sequence}`;
};

const createRfq = async (createdBy, itemsToRfq, prId) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const rfqNo = generateRfqNo();
        const rfqHeaderQuery = `
            INSERT INTO rfq_header (rfq_no, created_by, created_at, status, note, pr_id)
            VALUES ($1, $2, NOW(), $3, $4, $5)
            RETURNING rfq_id;
        `;
        const rfqHeaderValues = [rfqNo, createdBy, 'created', 'Created from PR', prId];
        const rfqHeaderResult = await client.query(rfqHeaderQuery, rfqHeaderValues);
        const rfqId = rfqHeaderResult.rows[0].rfq_id;

        for (const item of itemsToRfq) {
            const rfqDetailQuery = `
                INSERT INTO rfq_detail (rfq_id, item_id, qty, unit, remark)
                VALUES ($1, $2, $3, $4, $5);
            `;
            const rfqDetailValues = [rfqId, item.item_id, item.qty, item.unit, item.note];
            await client.query(rfqDetailQuery, rfqDetailValues);
        }

        await client.query('COMMIT');
        return { success: true, rfq_id: rfqId, rfq_no: rfqNo };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// ✅ ฟังก์ชันใหม่: ดึงรายการ RFQ ทั้งหมด
// ✅ ฟังก์ชันสำหรับดึงรายการ RFQ ทั้งหมด
const getAllRfq = async () => {
    const query = `
        SELECT 
            rh.rfq_id, 
            rh.rfq_no, 
            rh.status, 
            rh.created_at,
            CONCAT(u.user_fname, ' ', u.user_lname) AS created_by_name
        FROM rfq_header AS rh
        JOIN users AS u ON rh.created_by = u.user_id
        ORDER BY rh.created_at DESC;
    `;
    const result = await pool.query(query);
    return result.rows;
};

// ✅ ฟังก์ชันสำหรับดึงรายละเอียด RFQ ตาม ID
// (ส่วนนี้คุณยังขาดไป ผมจะใส่โค้ดที่ถูกต้องให้ครับ)
const getRfqById = async (rfqId) => {
    const query = `
        SELECT 
            rh.rfq_id,
            rh.rfq_no,
            rh.status,
            rh.note,
            rh.created_at,
            rh.pr_id,
            ph.pr_no,
            CONCAT(u.user_fname, ' ', u.user_lname) AS created_by_name,
            (SELECT json_agg(
                jsonb_build_object(
                    'rfq_detail_id', rd.rfq_detail_id,
                    'item_id', rd.item_id,
                    'item_name', i.item_name,
                    'qty', rd.qty,
                    'unit', rd.unit,
                    'remark', rd.remark
                )
            )
            FROM rfq_detail AS rd
            JOIN items AS i ON rd.item_id = i.item_id
            WHERE rd.rfq_id = rh.rfq_id) AS items
        FROM rfq_header AS rh
        JOIN users AS u ON rh.created_by = u.user_id
        LEFT JOIN pr_header AS ph ON rh.pr_id = ph.pr_id
        WHERE rh.rfq_id = $1;
    `;
    const result = await pool.query(query, [rfqId]);
    return result.rows[0] || null;
};

// ✅ export เฉพาะฟังก์ชันที่เกี่ยวข้องกับ RFQ
module.exports = {
    createRfq,
    getAllRfq,
    getRfqById
};