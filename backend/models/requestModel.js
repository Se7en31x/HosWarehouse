const { pool } = require("../config/db"); // ตรวจสอบว่าเส้นทางถูกต้อง

// Helper function เพื่อสร้างรหัสคำขอใหม่
const generateRequestCode = async () => {
  const result = await pool.query(`SELECT COUNT(*) FROM requests`);
  const count = parseInt(result.rows[0].count || '0') + 1;
  const padded = count.toString().padStart(5, '0');
  return `REQ-${padded}`;
};

/**
 * สร้างคำขอใหม่ในตาราง 'requests' พร้อมบันทึกสถานะเริ่มต้น
 *
 * @param {object} params - พารามิเตอร์สำหรับคำขอใหม่
 * @param {number} params.user_id - ID ของผู้ใช้ที่สร้างคำขอ
 * @param {string} params.note - หมายเหตุทั่วไปสำหรับคำขอ
 * @param {boolean} params.urgent - ระบุว่าเป็นคำขอด่วนหรือไม่
 * @param {string} params.date - วันที่ครบกำหนดของคำขอ (เช่น 'YYYY-MM-DD')
 * @param {string} params.type - ประเภทของคำขอ (เช่น 'borrow', 'withdraw')
 * @returns {Promise<object>} ID และรหัสของคำขอที่สร้างขึ้นใหม่
 */
exports.createRequest = async ({ user_id, note, urgent, date, type }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN'); // เริ่มต้น Transaction

    const code = await generateRequestCode();

    // 1. สร้างคำขอในตาราง requests
    const result = await client.query(
      `INSERT INTO requests
        (request_code, user_id, request_status, request_note, is_urgent, request_due_date, request_date, request_type)
        VALUES ($1, $2, 'waiting_approval', $3, $4, $5, NOW(), $6)
        RETURNING request_id, request_code`,
      [code, user_id, note, urgent, date, type]
    );

    const newRequestId = result.rows[0].request_id;

    // 2. บันทึกประวัติสถานะของคำขอหลัก (request_overall)
    await client.query(
    `INSERT INTO request_status_history
        (request_id, changed_by, changed_at, history_type, old_value_type, old_value, new_value, note)
        VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7)`,
    [
        newRequestId,
        user_id,
        'request_creation',     // history_type
        'request_status',       // old_value_type
        null,                   // old_value (สถานะเดิมไม่มี)
        'waiting_approval',     // new_value
        'สร้างคำขอใหม่'           // note
    ]
);

    await client.query('COMMIT'); // Commit Transaction

    return result.rows[0]; // คืนค่า ID และรหัสคำขอที่สร้าง
  } catch (err) {
    await client.query('ROLLBACK'); // Rollback หากเกิดข้อผิดพลาด
    console.error("Error in createRequest:", err);
    throw err;
  } finally {
    client.release(); // คืน Connection กลับ Pool
  }
};

/**
 * เพิ่มรายการย่อยของคำขอในตาราง 'request_details' พร้อมบันทึกสถานะเริ่มต้น
 *
 * @param {object} params - พารามิเตอร์สำหรับรายละเอียดคำขอใหม่
 * @param {number} params.request_id - ID ของคำขอหลัก
 * @param {number} params.item_id - ID ของรายการ (item) ที่ร้องขอ
 * @param {number} params.quantity - จำนวนของรายการที่ร้องขอ
 * @param {string} params.request_detail_type - ประเภทของรายการย่อย (เช่น 'borrow', 'withdraw')
 * @param {number} params.user_id - ID ของผู้ใช้ที่ดำเนินการนี้ (สำหรับบันทึกประวัติ)
 * @returns {Promise<void>}
 */
// เพิ่ม expected_return_date ในพารามิเตอร์
exports.addRequestDetail = async ({ request_id, item_id, quantity, request_detail_type, user_id, expected_return_date }) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const result = await client.query(
            `INSERT INTO request_details
            (request_id, item_id, requested_qty, request_detail_type, approval_status, processing_status, expected_return_date)
            VALUES ($1, $2, $3, $4, 'waiting_approval_detail', 'pending', $5)
            RETURNING request_detail_id`,
            // เพิ่ม expected_return_date เข้าไปใน array ของค่า
            [request_id, item_id, quantity, request_detail_type, expected_return_date]
        );

        const newRequestDetailId = result.rows[0].request_detail_id;

        // โค้ดที่แก้ไขให้ใช้กับตารางใหม่
await client.query(
    `INSERT INTO request_status_history
        (request_id, request_detail_id, changed_by, changed_at, history_type, old_value_type, old_value, new_value, note)
        VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8)`,
    [
        request_id,
        newRequestDetailId,
        user_id,
        'detail_creation',         // history_type
        'approval_status',          // old_value_type
        null,                       // old_value (สถานะเดิมไม่มี)
        'waiting_approval_detail',  // new_value
        'สร้างรายการย่อยใหม่'         // note
    ]
);

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error in addRequestDetail:", err);
        throw err;
    } finally {
        client.release();
    }
};

/**
 * ดึงคำขอตามสถานะคำขอโดยรวมที่กำหนด.
 *
 * @param {string[]} statuses - Array ของสถานะคำขอที่ต้องการดึง.
 * @returns {Promise<object[]>} Array ของ object คำขอ.
 */
exports.getRequestsByStatus = async (statuses = ['waiting_approval']) => {
  // สร้างพารามิเตอร์แบบ dynamic สำหรับเงื่อนไข IN
  const params = statuses.map((_, i) => `$${i + 1}`).join(', ');

  const query = `
    SELECT
      r.request_id,
      r.request_code,
      r.request_date,
      r.request_status,
      u.user_name,
      u.department,
      STRING_AGG(DISTINCT
        CASE
          WHEN rd.request_detail_type = 'borrow' THEN 'ยืม'
          WHEN rd.request_detail_type = 'withdraw' THEN 'เบิก'
          ELSE rd.request_detail_type
        END,
        ','
      ) AS request_types,
      COUNT(rd.request_detail_id) AS item_count
    FROM requests r
    JOIN users u ON r.user_id = u.user_id
    LEFT JOIN request_details rd ON r.request_id = rd.request_id
    WHERE r.request_status IN (${params})
    GROUP BY r.request_id, r.request_date, r.request_status, u.user_name, u.department
    ORDER BY r.request_date DESC;
  `;

  const result = await pool.query(query, statuses);
  return result.rows;
};