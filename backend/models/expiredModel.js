const { pool } = require('../config/db');

const ExpiredModel = {
  // ======================
  // ดึง lot ที่หมดอายุ
  // ======================
  async getAll() {
    try {
      const result = await pool.query(`
        SELECT 
          il.lot_id,
          il.item_id,
          i.item_name,
          i.item_unit,
          il.exp_date,
          il.is_expired,
          il.qty_imported,
          il.lot_no,
          il.qty_remaining,
          ei.expired_qty,  -- จำนวนที่หมดอายุจริง
          COALESCE(SUM(ea.action_qty), 0) AS disposed_qty  -- จำนวนที่ทำลายแล้ว
        FROM item_lots il
        JOIN expired_items ei ON il.lot_id = ei.lot_id
        LEFT JOIN items i ON il.item_id = i.item_id
        LEFT JOIN expired_actions ea ON il.lot_id = ea.lot_id
        WHERE il.is_expired = true
          AND (i.is_deleted = false OR i.is_deleted IS NULL)
        GROUP BY il.lot_id, il.item_id, i.item_name, i.item_unit, 
                 il.exp_date, il.is_expired, il.qty_imported, 
                 il.lot_no, il.qty_remaining, ei.expired_qty
        ORDER BY il.exp_date ASC;
      `);
      return result.rows;
    } catch (err) {
      console.error('getExpiredLots error:', err);
      throw err;
    }
  },

  // ======================
  // บันทึกการทำลาย (Dispose)
  // ======================
  async addAction({ lot_id, item_id, action_by, note }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // ✅ insert ลง expired_actions โดยอ้างอิงจำนวนหมดอายุจาก expired_items
      await client.query(
        `INSERT INTO expired_actions 
          (lot_id, item_id, action_type, action_qty, action_by, note, action_date)
         SELECT $1, $2, 'disposed', ei.expired_qty, $3, $4, NOW()
         FROM expired_items ei
         WHERE ei.lot_id = $1
         LIMIT 1`,
        [lot_id, item_id, action_by, note]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('addAction error:', err);
      throw err;
    } finally {
      client.release();
    }
  },

  // ======================
  // ดึงประวัติการทิ้งตาม lot
  // ======================
  async getActionsByLotId(lot_id) {
    const query = `
      SELECT 
        a.action_id,
        a.lot_id,
        a.action_type,
        a.action_qty,
        a.note,
        a.action_date,
        u.user_fname || ' ' || u.user_lname AS action_by_name
      FROM expired_actions a
      LEFT JOIN users u ON a.action_by = u.user_id
      WHERE a.lot_id = $1
      ORDER BY a.action_date DESC;
    `;
    const { rows } = await pool.query(query, [lot_id]);
    return rows;
  }
};

module.exports = ExpiredModel;
