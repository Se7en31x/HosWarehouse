const { pool } = require("../config/db");

// Model Function: ดึงรายการสินค้าทั้งหมด (รวม item_barcode)
exports.getAllItems = async () => {
    const query = `
        SELECT
            item_id,
            item_name,
            item_unit,
            vendor_item_code,
            item_barcode
        FROM items
        WHERE is_deleted = false
        ORDER BY item_name ASC;
    `;
    const result = await pool.query(query);
    return result.rows;
};

// Model Function: ค้นหาสินค้าด้วย Barcode
exports.findItemByBarcode = async (barcode) => {
    const query = `
        SELECT
            item_id,
            item_name,
            item_unit,
            vendor_item_code,
            item_barcode
        FROM items
        WHERE item_barcode = $1
        AND is_deleted = false;
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

        // 2. สร้างรายการรายละเอียดในตาราง `import_details` และอัปเดตจำนวนสินค้า
        for (const item of receivingItems) {
            // สร้างรายการใน import_details
            await client.query(
                `INSERT INTO import_details (import_id, item_id, import_qty, import_price, import_expiry_date, import_note, vendor_item_code)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    newReceivingId,
                    item.item_id,
                    item.quantity,
                    item.pricePerUnit,
                    item.expiryDate,
                    item.notes,
                    item.vendor_item_code
                ]
            );

            // อัปเดตจำนวนสินค้าในตาราง items
            await client.query(
                `UPDATE items
                 SET item_qty = item_qty + $1,
                     item_update = NOW()
                 WHERE item_id = $2`,
                [item.quantity, item.item_id]
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