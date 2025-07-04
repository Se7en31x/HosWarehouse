const { pool } = require("../config/db");

// ดึงข้อมูลคำขอสำหรับการอนุมัติ
exports.getRequestForApproval = async (request_id) => {
  const query = `
    SELECT r.*, u.user_name, u.department
    FROM requests r
    JOIN users u ON r.user_id = u.user_id
    WHERE r.request_id = $1
  `;
  const result = await pool.query(query, [request_id]);
  return result.rows[0];
};

// ดึงรายละเอียดรายการคำขอ พร้อมชื่อและหน่วย และชื่อไฟล์รูปภาพ
exports.getRequestDetails = async (request_id) => {
  const query = `
    SELECT rd.*, i.item_name, i.item_unit, i.item_img
    FROM request_details rd
    JOIN items i ON rd.item_id = i.item_id
    WHERE rd.request_id = $1
  `;
  const result = await pool.query(query, [request_id]);
  return result.rows;
};

// อัปเดตสถานะคำขอหลัก
exports.updateRequestStatus = async (request_id, newStatus) => {
  const result = await pool.query(
    `UPDATE requests SET request_status = $1 WHERE request_id = $2`,
    [newStatus, request_id]
  );
  return result.rowCount > 0;
};

// อัปเดตสถานะรายละเอียดคำขอ
exports.updateRequestDetailStatus = async (request_detail_id, newStatus) => {
  const result = await pool.query(
    `UPDATE request_details SET request_detail_status = $1 WHERE request_detail_id = $2`,
    [newStatus, request_detail_id]
  );
  return result.rowCount > 0;
};

// ฟังก์ชันตรวจสอบสถานะรวม (pending, approved, rejected)
exports.calculateOverallStatus = async (request_id) => {
  const query = `
    SELECT request_detail_status
    FROM request_details
    WHERE request_id = $1
  `;
  const result = await pool.query(query, [request_id]);
  const statuses = result.rows.map(row => row.request_detail_status);

  const total = statuses.length;
  const approved = statuses.filter(s => s === 'approved').length;
  const rejected = statuses.filter(s => s === 'rejected').length;

  if (approved === total) return 'อนุมัติทั้งหมด';
  if (rejected === total) return 'ปฏิเสธทั้งหมด';
  if (approved > 0 || rejected > 0) return 'อนุมัติบางส่วน';
  return 'รอดำเนินการ';
};

// อัปเดตสถานะคำขอหลักโดยอิงจากสถานะรายการย่อยทั้งหมด
exports.updateRequestStatusByDetails = async (request_id) => {
  const newStatus = await exports.calculateOverallStatus(request_id);
  return await exports.updateRequestStatus(request_id, newStatus);
};

// ใช้เพื่อค้นหา request_id จาก request_detail_id
exports.getRequestIdByDetailId = async (request_detail_id) => {
  const result = await pool.query(
    `SELECT request_id FROM request_details WHERE request_detail_id = $1`,
    [request_detail_id]
  );
  return result.rows[0]?.request_id || null;
};

// ตรวจสอบสถานะปัจจุบันของรายการย่อย
exports.getRequestDetailStatus = async (request_detail_id) => {
  const result = await pool.query(
    `SELECT request_detail_status FROM request_details WHERE request_detail_id = $1`,
    [request_detail_id]
  );
  return result.rows[0]?.request_detail_status || null;
};
