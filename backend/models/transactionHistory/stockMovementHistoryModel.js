const { pool } = require('../../config/db');

const StockMovementHistoryModel = {
  async getByCode(moveCode) {
    const sql = `
      SELECT sm.move_id, sm.move_code, sm.item_id, i.item_name,
             sm.move_qty, sm.move_date, sm.move_status, sm.note,
             u.user_fname || ' ' || u.user_lname AS moved_by
      FROM stock_movements sm
      LEFT JOIN items i ON sm.item_id = i.item_id
      LEFT JOIN users u ON sm.user_id = u.user_id
      WHERE sm.move_code = $1
    `;
    const { rows } = await pool.query(sql, [moveCode]);
    return rows;
  }
};

module.exports = StockMovementHistoryModel;
