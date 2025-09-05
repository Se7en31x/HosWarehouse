const { pool } = require('../config/db');
const { generateStockoutCode } = require('../utils/stockoutCounter');

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
          COALESCE(ea.disposed_qty, 0) AS disposed_qty  -- จำนวนที่ทำลายแล้ว
        FROM item_lots il
        JOIN expired_items ei ON il.lot_id = ei.lot_id
        LEFT JOIN items i ON il.item_id = i.item_id
        LEFT JOIN (
          SELECT lot_id, SUM(action_qty) AS disposed_qty
          FROM expired_actions
          GROUP BY lot_id
        ) ea ON il.lot_id = ea.lot_id
        WHERE il.is_expired = true
          AND (i.is_deleted = false OR i.is_deleted IS NULL)
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
async addAction({ lot_id, item_id, action_qty, action_by, note }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) หา stockout เดิมที่ผูกกับ lot
    const { rows: existingStockout } = await client.query(
      `SELECT so.stockout_id
       FROM stock_outs so
       JOIN stock_out_details sod ON so.stockout_id = sod.stockout_id
       WHERE sod.lot_id = $1
       LIMIT 1`,
      [lot_id]
    );

    let stockoutId;
    if (existingStockout.length > 0) {
      // 👉 reuse stockout เดิม
      stockoutId = existingStockout[0].stockout_id;
    } else {
      // 👉 gen ใหม่
      const stockoutNo = await generateStockoutCode(client);
      const { rows } = await client.query(
        `INSERT INTO stock_outs 
          (stockout_no, stockout_date, stockout_type, note, user_id, created_at)
         VALUES ($1, NOW(), 'expired_dispose', $2, $3, NOW())
         RETURNING stockout_id`,
        [stockoutNo, `ทำลาย lot #${lot_id}`, action_by]
      );
      stockoutId = rows[0].stockout_id;
    }

    // 2) insert stock_out_details
    const { rows: unitRows } = await client.query(
      `SELECT item_unit FROM items WHERE item_id = $1`,
      [item_id]
    );
    const itemUnit = unitRows[0]?.item_unit || 'ชิ้น';

    await client.query(
      `INSERT INTO stock_out_details
        (stockout_id, item_id, lot_id, qty, unit, note)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [stockoutId, item_id, lot_id, action_qty, itemUnit, note || 'ทำลาย']
    );

    // 3) insert expired_actions (log)
    await client.query(
      `INSERT INTO expired_actions 
        (lot_id, item_id, action_type, action_qty, action_by, note, action_date)
       VALUES ($1, $2, 'disposed', $3, $4, $5, NOW())`,
      [lot_id, item_id, action_qty, action_by, note]
    );

    await client.query('COMMIT');
    return { success: true, stockout_id: stockoutId };
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
