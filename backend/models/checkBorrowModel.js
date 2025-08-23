// backend/controllers/checkBorrow.js
const { pool } = require('../config/db'); // db connect ของคุณ

// ✅ เช็คว่าผู้ใช้นี้ยังมีการยืมค้างหรือไม่
exports.checkPendingBorrow = async (req, res) => {
    const { userId, itemId } = req.params;  // อาจส่งมาเฉพาะ userId หรือ userId+itemId

    try {
        let query;
        let values;

        if (itemId) {
            // 👉 แบบเช็คเฉพาะ item
            query = `
        SELECT r.request_id, rd.item_id, r.borrow_status
        FROM requests r
        JOIN request_details rd ON r.request_id = rd.request_id
        WHERE r.user_id = $1 
          AND rd.item_id = $2
          AND r.borrow_status IN ('waiting_borrow','borrowing')
      `;
            values = [userId, itemId];
        } else {
            // 👉 แบบเช็คทั้ง user
            query = `
        SELECT request_id, borrow_status
        FROM requests
        WHERE user_id = $1
          AND borrow_status IN ('waiting_borrow','borrowing')
      `;
            values = [userId];
        }

        const result = await pool.query(query, values);

        if (result.rows.length > 0) {
            return res.status(200).json({ hasPending: true, data: result.rows });
        }

        return res.status(200).json({ hasPending: false });
    } catch (err) {
        console.error('❌ Error checkPendingBorrow:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการตรวจสอบการยืม' });
    }
};
