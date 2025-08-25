const { pool } = require("../config/db");
const { generateImportNo } = require("../utils/docCounter");

// Helper: normalize date value
function normalizeDate(value) {
    if (!value || (typeof value === "string" && value.trim() === "")) {
        return null; // ถ้าเป็น "" หรือ undefined/null → คืนค่า null
    }
    return value; // ถ้าเป็น YYYY-MM-DD ปกติ → ใช้ได้เลย
}

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
            i.item_barcode
        FROM items AS i
        WHERE i.item_barcode = $1
        AND i.is_deleted = false;
    `;
    const result = await pool.query(query, [barcode]);
    return result.rows[0]; // คืนค่ารายการแรกที่พบ
};

// Model Function: บันทึกการรับเข้าสินค้า (รับเข้าทั่วไป)
exports.recordReceiving = async ({ user_id, receiving_note, import_type, source_name, receivingItems }) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // ✅ gen เลขเอกสารใหม่จาก docCounter
        const import_no = await generateImportNo(client, import_type || 'general');

        // ───────────── INSERT HEADER ─────────────
        const insertReceiving = await client.query(
            `INSERT INTO imports (
                import_date, user_id, import_status, import_note, import_type, source_name, import_no
             )
             VALUES (NOW(), $1, 'posted', $2, $3, $4, $5)
             RETURNING import_id, import_no`,
            [user_id, receiving_note || null, import_type || 'general', source_name || null, import_no]
        );

        const newReceivingId = insertReceiving.rows[0].import_id;

        // ───────────── INSERT DETAILS ─────────────
        for (const item of receivingItems) {
            if (!item.item_id) throw new Error(`Missing item_id`);
            if (!item.quantity || item.quantity <= 0) throw new Error(`Invalid quantity for item_id ${item.item_id}`);
            if (!item.lotNo) throw new Error(`Missing lot number for item_id ${item.item_id}`);

            await client.query(
                `INSERT INTO import_details 
                    (import_id, item_id, exp_date, import_note, vendor_item_code, quantity, purchase_quantity, purchase_unit, conversion_rate)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
                [
                    newReceivingId,
                    item.item_id,
                    normalizeDate(item.expiryDate),   // ✅ ใช้ normalizeDate
                    item.notes || null,
                    item.vendor_item_code || null,
                    item.quantity,
                    item.purchaseQuantity || null,
                    item.purchaseUnit || null,
                    item.conversionRate || null
                ]
            );

            await client.query(
                `INSERT INTO item_lots 
                    (item_id, import_id, lot_no, qty_imported, qty_remaining, mfg_date, exp_date, import_date, created_by, document_no)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8,$9)`,
                [
                    item.item_id,
                    newReceivingId,
                    item.lotNo,
                    item.quantity,
                    item.quantity,
                    item.mfgDate || null,
                    normalizeDate(item.expiryDate),   // ✅ ใช้ normalizeDate
                    user_id,
                    item.documentNo || null
                ]
            );
        }

        await client.query('COMMIT');
        return { success: true, import_id: newReceivingId, import_no };
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Error in recordReceiving:", err);
        throw err;
    } finally {
        client.release();
    }
};
