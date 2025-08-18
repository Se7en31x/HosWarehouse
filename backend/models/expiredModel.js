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
          COALESCE(SUM(ea.action_qty), 0) AS disposed_qty
        FROM item_lots il
        LEFT JOIN items i ON il.item_id = i.item_id
        LEFT JOIN expired_actions ea ON il.lot_id = ea.lot_id
        WHERE il.is_expired = true
          AND (i.is_deleted = false OR i.is_deleted IS NULL)
        GROUP BY il.lot_id, il.item_id, i.item_name, i.item_unit, il.exp_date, il.is_expired, il.qty_imported, il.lot_no, il.qty_remaining
        ORDER BY il.exp_date ASC;
      `);
      return result.rows;
    } catch (err) {
      console.error('getExpiredLots error:', err);
      throw err;
    }
  },

  // ======================
  // บันทึกการทำลาย
  // ======================
  async addAction({ lot_id, item_id, action_qty, action_by, note }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // ✅ บันทึกการทำลายลงใน expired_actions
      await client.query(
        `INSERT INTO expired_actions 
          (lot_id, item_id, action_type, action_qty, action_by, note, action_date)
         VALUES ($1, $2, 'disposed', $3, $4, $5, NOW())`,
        [lot_id, item_id, action_qty, action_by, note]
      );

      // ✅ อัปเดต qty_remaining ใน item_lots (ตัดสต็อกในระดับ lot)
      await client.query(
        `UPDATE item_lots
           SET qty_remaining = GREATEST(qty_remaining - $1, 0)
         WHERE lot_id = $2`,
        [action_qty, lot_id]
      );

      // ✅ คำนวณ stock รวมใหม่จากทุก lot ของ item_id นี้
      const { rows } = await client.query(
        `SELECT COALESCE(SUM(qty_remaining), 0) AS total_remaining
         FROM item_lots
         WHERE item_id = $1`,
        [item_id]
      );
      const totalRemaining = rows[0].total_remaining;

      // ✅ เก็บค่ารวมกลับเข้า items (เพิ่มคอลัมน์ qty_total เองถ้ามีใน schema)
      // ถ้าไม่มีคอลัมน์ qty_total ให้ข้ามส่วนนี้ไป
      // หรือถ้าคุณไม่อยากเก็บค่าใน DB สามารถอ้างอิงจาก item_lots ตอน query ได้เสมอ
      await client.query(
        `UPDATE items
           SET updated_at = NOW()
         WHERE item_id = $1`,
        [item_id]
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
