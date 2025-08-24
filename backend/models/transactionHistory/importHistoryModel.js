const { pool } = require('../../config/db');

const ImportHistoryModel = {
  async getAll() {
    const sql = `
      SELECT i.import_id, i.import_code, i.import_date, i.import_status,
             u.user_fname || ' ' || u.user_lname AS imported_by
      FROM imports i
      LEFT JOIN users u ON i.user_id = u.user_id
      ORDER BY i.import_date DESC
    `;
    const { rows } = await pool.query(sql);
    return rows;
  },

  async getDetail(importId) {
    const sql = `
      SELECT id.detail_id, it.item_name, id.qty, id.unit_price
      FROM import_details id
      JOIN items it ON id.item_id = it.item_id
      WHERE id.import_id = $1
    `;
    const { rows } = await pool.query(sql, [importId]);
    return rows;
  }
};

module.exports = ImportHistoryModel;
