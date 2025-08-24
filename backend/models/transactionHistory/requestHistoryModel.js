const { pool } = require('../../config/db');

const RequestHistoryModel = {
  async getAll({ page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    const sql = `
      SELECT r.request_id, r.request_code, r.request_date, r.request_status,
             u.department, u.user_fname || ' ' || u.user_lname AS requester
      FROM requests r
      LEFT JOIN users u ON r.user_id = u.user_id
      ORDER BY r.request_date DESC
      OFFSET $1 LIMIT $2
    `;
    const { rows } = await pool.query(sql, [offset, limit]);
    return rows;
  },

  async getDetail(requestId) {
    const sql = `
      SELECT rd.request_detail_id, i.item_name, rd.qty, rd.unit, rd.status
      FROM request_details rd
      JOIN items i ON rd.item_id = i.item_id
      WHERE rd.request_id = $1
    `;
    const { rows } = await pool.query(sql, [requestId]);
    return rows;
  }
};

module.exports = RequestHistoryModel;
