const { pool } = require('../../config/db');

const ReturnHistoryModel = {
  async getByRequestId(requestId) {
    const sql = `
      SELECT br.return_id, br.return_date, br.return_qty, br.return_status,
             i.item_name,
             u.user_fname || ' ' || u.user_lname AS inspected_by
      FROM borrow_returns br
      JOIN request_details rd ON br.request_detail_id = rd.request_detail_id
      JOIN items i ON rd.item_id = i.item_id
      LEFT JOIN users u ON br.inspected_by = u.user_id
      WHERE rd.request_id = $1
      ORDER BY br.return_date DESC
    `;
    const { rows } = await pool.query(sql, [requestId]);
    return rows;
  }
};

module.exports = ReturnHistoryModel;
