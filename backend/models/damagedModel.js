const { pool } = require('../config/db');
const { generateImportNo } = require('../utils/docCounter');

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

        // 3. ✅ Generate import_no สำหรับ repair_return
        const import_no = await generateImportNo(client, 'repair_return');

        // 4. ✅ บันทึกเข้า imports
        const { rows: importRows } = await client.query(
          `INSERT INTO imports (
             import_date, user_id, import_status, import_type,
             source_name, source_type, source_ref_id, import_note, import_no
           )
           VALUES (NOW(), $1, 'posted', 'repair_return',
                   'ศูนย์ซ่อม', 'damaged_items', $2, $3, $4)
           RETURNING import_id`,
          [action_by, damaged_id, note || 'ซ่อมแล้วคืนคลัง', import_no]
        );
        const import_id = importRows[0].import_id;

        // 5. ✅ บันทึก import_details
        await client.query(
          `INSERT INTO import_details (import_id, item_id, quantity, import_note)
           VALUES ($1, $2, $3, $4)`,
          [import_id, item_id, action_qty, 'ซ่อมแล้วคืนเข้าคลัง']
        );

        // 6. อัปเดตให้ lot เชื่อมกับ import นี้ (ถ้าอยาก track)
        if (lot_id) {
          await client.query(
            `UPDATE item_lots
             SET import_id = $1
             WHERE lot_id = $2`,
            [import_id, lot_id]
          );
        }

      } else if (action_type === 'disposed') {
        // ของถูกทิ้ง → update disposed
        await client.query(
          `UPDATE damaged_items
           SET disposed_qty = COALESCE(disposed_qty,0) + $1
           WHERE damaged_id = $2`,
          [action_qty, damaged_id]
        );
        // ไม่คืนเข้าคลัง
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
