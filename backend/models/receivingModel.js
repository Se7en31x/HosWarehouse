const { pool } = require("../config/db");

// Model Function: ดึงรายการสินค้าทั้งหมด (รวม item_barcode)
exports.getAllItems = async () => {
    const query = `
        SELECT
            i.item_id,
            i.item_name,
            i.item_unit,
            i.item_category, 
            i.item_sub_category,
            i.item_barcode,
            id.vendor_item_code 
        FROM items AS i
        LEFT JOIN (
            SELECT
                item_id,
                vendor_item_code,
                ROW_NUMBER() OVER (PARTITION BY item_id ORDER BY import_id DESC) as rn
            FROM import_details
        ) AS id ON i.item_id = id.item_id AND id.rn = 1
        WHERE i.is_deleted = false
        ORDER BY i.item_name ASC;
    `;
    const result = await pool.query(query);
    return result.rows;
};

// Model Function: ค้นหาสินค้าด้วย Barcode
exports.findItemByBarcode = async (barcode) => {
    const query = `
        SELECT
            i.item_id,
            i.item_name,
            i.item_unit,
            i.item_category,
            i.item_sub_category,
            i.item_barcode,
            il.unit_price,
            il.unit_cost
        FROM items AS i
        LEFT JOIN (
            SELECT
                item_id,
                unit_price,
                unit_cost,
                ROW_NUMBER() OVER (PARTITION BY item_id ORDER BY import_id DESC) as rn
            FROM item_lots
        ) AS il ON i.item_id = il.item_id AND il.rn = 1
        WHERE i.item_barcode = $1
        AND i.is_deleted = false;
    `;
    const result = await pool.query(query, [barcode]);
    return result.rows[0]; // คืนค่ารายการแรกที่พบ
};

// Model Function: บันทึกการรับเข้าสินค้า
exports.recordReceiving = async ({ user_id, supplier_id, receiving_note, receivingItems }) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // เริ่มต้น Transaction

        // 1. สร้างรายการรับเข้าหลักในตาราง `imports`
        const receivingResult = await client.query(
            `INSERT INTO imports (import_date, supplier_id, user_id, import_status, import_note)
             VALUES (NOW(), $1, $2, 'Completed', $3)
             RETURNING import_id`,
            [supplier_id, user_id, receiving_note]
        );
        const newReceivingId = receivingResult.rows[0].import_id;

        // 2. สร้างรายการในตาราง `import_details` และ `item_lots`
        for (const item of receivingItems) {
            // สร้างรายการใน import_details
            await client.query(
                `INSERT INTO import_details (import_id, item_id, import_price, exp_date, import_note, vendor_item_code)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    newReceivingId,
                    item.item_id,
                    item.pricePerUnit,
                    item.expiryDate,
                    item.notes,
                    item.vendor_item_code
                ]
            );

            // สร้าง lot ใหม่ในตาราง item_lots พร้อมข้อมูลที่ครบถ้วน
            await client.query(
                `INSERT INTO item_lots (item_id, import_id, lot_no, qty_imported, qty_remaining, mfg_date, exp_date, import_date, created_by, document_no, unit_cost, unit_price)
                 VALUES ($1, $2, $3, $4, $4, $5, $6, NOW(), $7, $8, $9, $10)`,
                [
                    item.item_id,
                    newReceivingId,
                    item.lotNo,
                    item.quantity,
                    item.mfgDate || null, 
                    item.expiryDate,
                    user_id, // ใช้ user_id จาก request
                    item.documentNo || null,
                    item.pricePerUnit, // unit_cost
                    item.sellingPrice || 0
                ]
            );
        }

        await client.query('COMMIT'); // Commit Transaction

        return { import_id: newReceivingId };
    } catch (err) {
        await client.query('ROLLBACK'); // Rollback หากเกิดข้อผิดพลาด
        console.error("Error in recordReceiving:", err);
        throw err;
    } finally {
        client.release();
    }
};