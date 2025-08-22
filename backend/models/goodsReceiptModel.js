const { pool } = require("../config/db");

// Model Function: ดึงรายการนำเข้าสินค้าทั้งหมด
exports.getAllGoodsReceipts = async () => {
    const query = `
    SELECT
      i.import_id,
      i.gr_no,
      i.import_date,
      s.supplier_name,
      i.import_status,
      u.user_fname || ' ' || u.user_lname AS user_name
    FROM imports AS i
    LEFT JOIN suppliers AS s ON i.supplier_id = s.supplier_id
    LEFT JOIN users AS u ON i.user_id = u.user_id
    ORDER BY i.import_date DESC;
  `;
    const result = await pool.query(query);
    return result.rows;
};

// Model Function: ดึงรายละเอียดการนำเข้าสินค้าตาม ID
exports.getGoodsReceiptDetails = async (id) => {
    const query = `
    SELECT
      i.import_id,
      i.gr_no,
      i.import_date,
      i.import_note,
      s.supplier_name,
      u.user_fname || ' ' || u.user_lname AS user_name,
      json_agg(
        json_build_object(
          'item_name', it.item_name,
          'quantity', idt.quantity,
          'lot_no', il.lot_no,
          'exp_date', il.exp_date,
          'import_price', idt.import_price
        )
      ) AS items
    FROM imports AS i
    LEFT JOIN suppliers AS s ON i.supplier_id = s.supplier_id
    LEFT JOIN users AS u ON i.user_id = u.user_id
    LEFT JOIN import_details AS idt ON i.import_id = idt.import_id
    LEFT JOIN item_lots AS il ON idt.item_id = il.item_id AND il.import_id = i.import_id
    LEFT JOIN items AS it ON idt.item_id = it.item_id
    WHERE i.import_id = $1
    GROUP BY i.import_id, s.supplier_name, u.user_fname, u.user_lname;
  `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
};

// Model Function: บันทึกการรับเข้าสินค้า (พร้อม Transaction)
exports.recordReceiving = async ({ user_id, po_id, supplier_id, receiving_note, receivingItems }) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. สร้างเลขที่ GR อัตโนมัติ (ถ้ามี)
        // สำหรับตัวอย่างนี้ สมมติว่าสร้างเลขรันแบบง่ายๆ
        const grNo = `GR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000)}`;

        // 2. สร้างรายการรับเข้าหลักในตาราง `imports`
        const receivingResult = await client.query(
            `INSERT INTO imports (import_date, supplier_id, user_id, import_status, import_note, po_id, gr_no)
       VALUES (NOW(), $1, $2, 'Completed', $3, $4, $5)
       RETURNING import_id`,
            [supplier_id, user_id, receiving_note, po_id, grNo]
        );
        const newImportId = receivingResult.rows[0].import_id;

        // 3. สร้างรายการในตาราง `import_details` และ `item_lots`
        for (const item of receivingItems) {
            // ตรวจสอบข้อมูลก่อน Insert เพื่อป้องกัน Error
            const mfgDate = item.mfgDate || null;
            const expiryDate = item.expiryDate || null;
            const lotNo = item.lotNo || null;
            const vendorItemCode = item.vendor_item_code || null;
            const note = item.notes || null;
            const pricePerUnit = item.pricePerUnit || 0;
            const quantity = item.quantity || 0;

            // สร้างรายการใน import_details
            await client.query(
                `INSERT INTO import_details (import_id, item_id, import_price, quantity, exp_date, import_note, vendor_item_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [newImportId, item.itemId, pricePerUnit, quantity, expiryDate, note, vendorItemCode]
            );

            // สร้าง lot ใหม่ในตาราง item_lots
            const lotResult = await client.query(
                `INSERT INTO item_lots (item_id, import_id, lot_no, qty_imported, qty_remaining, mfg_date, exp_date, import_date, created_by, unit_cost)
         VALUES ($1, $2, $3, $4, $4, $5, $6, NOW(), $7, $8)
         RETURNING lot_id`,
                [item.itemId, newImportId, lotNo, quantity, mfgDate, expiryDate, user_id, pricePerUnit]
            );
            const newLotId = lotResult.rows[0].lot_id;

            // 4. บันทึกการเคลื่อนไหวของสต็อก
            const stockMoveQuery = `
        INSERT INTO stock_movements (item_id, lot_id, move_type, move_qty, move_date, move_status, user_id, note)
        VALUES ($1, $2, 'Import', $3, NOW(), 'Completed', $4, $5)
      `;
            await client.query(stockMoveQuery, [item.itemId, newLotId, quantity, user_id, `Imported via GR: ${grNo}`]);

        }

        await client.query('COMMIT');
        return { import_id: newImportId, gr_no: grNo };
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error in recordReceiving:", err);
        throw err;
    } finally {
        client.release();
    }
};