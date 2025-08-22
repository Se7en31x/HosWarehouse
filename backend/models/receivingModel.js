const { pool } = require("../config/db");

// Model Function: ดึงรายการสินค้าทั้งหมด (รวม item_barcode)
exports.getAllItems = async () => {
    const query = `
        SELECT
            i.item_id,
            i.item_name,
            i.item_unit,
            i.item_purchase_unit,
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
exports.recordReceiving = async ({ user_id, receiving_note, receivingItems }) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // ───────────── INSERT HEADER ─────────────
        const insertReceiving = await client.query(
            `INSERT INTO imports (import_date, user_id, import_status, import_note)
       VALUES (NOW(), $1, 'posted', $2)
       RETURNING import_id`,
            [user_id, receiving_note || null]
        );
        const newReceivingId = insertReceiving.rows[0].import_id;

        // ───────────── INSERT DETAILS ─────────────
        for (const item of receivingItems) {
            // ✅ กำหนดจำนวนที่รับเข้ามา (ไม่ให้ null แน่นอน)
            const qtyImported = item.itemQuantity ?? item.quantity ?? 0;

            console.log("DEBUG item:", item);
            console.log("DEBUG qtyImported:", qtyImported);

            // insert เข้า import_details
            await client.query(
                `INSERT INTO import_details 
        (import_id, item_id, import_price, exp_date, import_note, vendor_item_code, quantity, purchase_quantity, purchase_unit, conversion_rate)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
                [
                    newReceivingId,
                    item.item_id,
                    item.pricePerUnit,
                    item.expiryDate,
                    item.notes,
                    item.vendor_item_code,
                    item.quantity,             // ✅ ใช้ column 'quantity'
                    item.purchaseQuantity,
                    item.purchaseUnit,
                    item.conversionRate
                ]
            );

            await client.query(
                `INSERT INTO item_lots 
        (item_id, import_id, lot_no, qty_imported, qty_remaining, mfg_date, exp_date, import_date, created_by, document_no, unit_cost, unit_price)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8,$9,$10,$11)`,
                [
                    item.item_id,
                    newReceivingId,
                    item.lotNo,
                    item.quantity,             // ✅ qty_imported = item.quantity
                    item.quantity,             // ✅ qty_remaining = item.quantity
                    item.mfgDate || null,
                    item.expiryDate,
                    user_id,
                    item.documentNo || null,
                    item.pricePerUnit,
                    item.sellingPrice || 0
                ]
            );
        }

        await client.query('COMMIT');
        return { success: true, import_id: newReceivingId };
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Error in recordReceiving:", err);
        throw err;
    } finally {
        client.release();
    }
};