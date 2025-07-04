const { pool } = require("../config/db");

// ดึงคำขอทั้งหมดพร้อมชื่อผู้ใช้ + แผนก
exports.getAllRequestsWithUser = async () => {
  const query = `
    SELECT r.*, u.user_name, u.department
    FROM requests r
    JOIN users u ON r.user_id = u.user_id
    ORDER BY r.request_date DESC
  `;
  const result = await pool.query(query);
  return result.rows;
};

// อัปเดตสถานะ request หลัก
exports.updateRequestStatus = async (request_id, newStatus) => {
  const result = await pool.query(
    `UPDATE requests SET request_status = $1 WHERE request_id = $2`,
    [newStatus, request_id]
  );
  return result.rowCount > 0;
};

// ดึงข้อมูลคำขอหลัก
exports.getRequestById = async (request_id) => {
  const query = `
    SELECT r.*, u.user_name, u.department
    FROM requests r
    JOIN users u ON r.user_id = u.user_id
    WHERE r.request_id = $1
  `;
  const result = await pool.query(query, [request_id]);
  return result.rows[0];
};

// ดึงรายละเอียดคำขอ
exports.getRequestDetails = async (request_id) => {
  const query = `
    SELECT rd.*, i.item_name, i.item_unit
    FROM request_details rd
    JOIN items i ON rd.item_id = i.item_id
    WHERE rd.request_id = $1
  `;
  const result = await pool.query(query, [request_id]);
  return result.rows;
};
