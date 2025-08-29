// models/DamagedModel.js
const { pool } = require('../config/db');
const { generateStockinNo } = require('../utils/docCounter'); // ต้องมีฟังก์ชันนี้

const DamagedModel = {
  // ดึงรายการของชำรุดทั้งหมด
  async getAll() {
    try {
      const result = await pool.query(`
      SELECT
        di.damaged_id,
        di.item_id,
        i.item_name,
        i.item_unit,
        di.damaged_qty,
        di.damage_type,
        di.damaged_note AS note,
        di.damaged_date,
        u.user_fname || ' ' || u.user_lname AS reporter_name,
        -- เหลือให้ดำเนินการ
        GREATEST(
          COALESCE(di.damaged_qty, 0)
          - (COALESCE(di.repaired_qty, 0) + COALESCE(di.disposed_qty, 0)),
          0
        ) AS remaining_qty,
        di.repaired_qty,
        di.disposed_qty,
        di.source_type,
        di.source_ref_id,
        br.return_date,
        br.condition AS return_condition,
        br.return_status,
        iu.user_fname || ' ' || iu.user_lname AS inspected_by_name,
        -- 🔹 ดึง actions ทั้งหมดแบบ array
        COALESCE(
          json_agg(
            json_build_object(
              'action_id', a.action_id,
              'action_type', a.action_type,
              'action_qty', a.action_qty,
              'action_date', a.action_date,
              'note', a.note,
              'action_by_name', au.user_fname || ' ' || au.user_lname
            )
            ORDER BY a.action_date DESC
          ) FILTER (WHERE a.action_id IS NOT NULL),
          '[]'
        ) AS actions
      FROM damaged_items di
      JOIN items i ON di.item_id = i.item_id
      LEFT JOIN users u ON di.reported_by = u.user_id
      LEFT JOIN borrow_returns br
        ON di.source_type = 'borrow_return' AND di.source_ref_id = br.return_id
      LEFT JOIN users iu ON br.inspected_by = iu.user_id
      LEFT JOIN damaged_actions a ON di.damaged_id = a.damaged_id
      LEFT JOIN users au ON a.action_by = au.user_id
      WHERE di.damage_type = 'damaged'
      GROUP BY di.damaged_id, i.item_name, i.item_unit, u.user_fname, u.user_lname,
               br.return_date, br.condition, br.return_status, iu.user_fname, iu.user_lname
      ORDER BY di.damaged_date DESC
      `);
      return result.rows;
    } catch (err) {
      console.error('getDamagedItems error:', err);
      throw err;
    }
  },

  // อัปเดตสถานะบางส่วน (ซ่อม/ทิ้ง)
  async addAction({ damaged_id, action_type, action_qty, action_by, note }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert action log
      await client.query(
        `INSERT INTO damaged_actions (damaged_id, action_type, action_qty, action_by, note)
         VALUES ($1, $2, $3, $4, $5)`,
        [damaged_id, action_type, action_qty, action_by, note]
      );

      // ✅ ดึงข้อมูล damaged item
      const { rows: damagedRows } = await client.query(
        `SELECT item_id, lot_id FROM damaged_items WHERE damaged_id = $1`,
        [damaged_id]
      );
      const item_id = damagedRows[0]?.item_id;
      const lot_id = damagedRows[0]?.lot_id;

      if (action_type === 'repaired') {
        // 1. อัปเดตจำนวนซ่อมแล้ว
        await client.query(
          `UPDATE damaged_items
           SET repaired_qty = COALESCE(repaired_qty,0) + $1
           WHERE damaged_id = $2`,
          [action_qty, damaged_id]
        );

        // 2. อัปเดต Lot
        if (lot_id) {
          await client.query(
            `UPDATE item_lots
             SET qty_remaining = COALESCE(qty_remaining, 0) + $1
             WHERE lot_id = $2`,
            [action_qty, lot_id]
          );
        }

        // 3. ✅ สร้างเอกสาร Stock In สำหรับของที่ซ่อมเสร็จ
        const stockinNo = await generateStockinNo(client, 'repair_return');

        // 4. ✅ บันทึก Header ใน stock_ins
        const { rows: stockinRows } = await client.query(
          `INSERT INTO stock_ins (
            stockin_no, stockin_date, stockin_type, note, user_id, created_at
           )
           VALUES (
            $1, NOW(), 'repair_return', $2, $3, NOW()
           )
           RETURNING stockin_id`,
          [stockinNo, `ของซ่อมเสร็จจาก Damaged ID: ${damaged_id}`, action_by]
        );
        const stockin_id = stockinRows[0].stockin_id;

        // 5. ✅ บันทึกรายละเอียดใน stock_in_details
        // ดึงหน่วยสินค้ามาด้วย
        const { rows: [itemInfo] } = await client.query(`
          SELECT item_unit FROM items WHERE item_id = $1
        `, [item_id]);

        await client.query(
          `INSERT INTO stock_in_details (stockin_id, item_id, lot_id, qty, unit, note)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [stockin_id, item_id, lot_id, action_qty, itemInfo.item_unit, 'ซ่อมแล้วคืนเข้าคลัง']
        );

      } else if (action_type === 'disposed') {
        // ของถูกทิ้ง -> update disposed quantity
        await client.query(
          `UPDATE damaged_items
           SET disposed_qty = COALESCE(disposed_qty,0) + $1
           WHERE damaged_id = $2`,
          [action_qty, damaged_id]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // ดึงประวัติการดำเนินการของ damaged_id
  async getActionsByDamagedId(damaged_id) {
    const query = `
      SELECT a.*, u.user_fname || ' ' || u.user_lname AS action_by_name
      FROM damaged_actions a
      LEFT JOIN users u ON a.action_by = u.user_id
      WHERE damaged_id = $1
      ORDER BY action_date DESC
    `;
    const { rows } = await pool.query(query, [damaged_id]);
    return rows;
  }
};

module.exports = DamagedModel;