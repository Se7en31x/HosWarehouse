const { pool } = require("../config/db");
const { generateStockinCode } = require("../utils/stockinCounter");

// ===== Helper: normalize date value =====
function normalizeDate(value) {
    if (!value || (typeof value === "string" && value.trim() === "")) {
        return null; // ถ้าเป็น "" หรือ undefined/null → คืนค่า null
    }
    return value; // ถ้าเป็น YYYY-MM-DD ปกติ → ใช้ได้เลย
}

// ===== Helper: Generate Lot No =====
async function generateLotNo(client, item_id) {
    const { rows } = await client.query(
        `SELECT item_category FROM items WHERE item_id = $1`, [item_id]
    );
    if (!rows.length) throw new Error(`Item not found: ${item_id}`);

    const category = rows[0].item_category;

    // กำหนด prefix ตามหมวด
    let prefix;
    switch (category) {
        case "medicine": prefix = "MED"; break;
        case "medsup": prefix = "SUP"; break;
        case "equipment": prefix = "EQP"; break;
        case "meddevice": prefix = "MDV"; break;
        case "general": prefix = "GEN"; break;
        default: prefix = "UNK";
    }

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD

    // หา running ของวันนั้นสำหรับ item_id
    const { rows: cntRows } = await client.query(
        `SELECT COUNT(*)::int AS cnt 
         FROM item_lots 
         WHERE lot_no LIKE $1`,
        [`${prefix}-${item_id}-${today}%`]
    );

    const seq = (cntRows[0].cnt + 1).toString().padStart(3, "0");

    return `${prefix}-${item_id}-${today}-${seq}`;
}

// ===== Model Function: ดึงรายการสินค้าทั้งหมด =====
exports.getAllItems = async () => {
    const query = `
        SELECT
            i.item_id,
            i.item_name,
            i.item_unit,
            i.item_purchase_unit,
            i.item_category, 
            i.item_sub_category,
            i.item_barcode
        FROM items AS i
        WHERE i.is_deleted = false
        ORDER BY i.item_name ASC;
    `;
    const result = await pool.query(query);
    return result.rows;
};

// ===== Model Function: ค้นหาสินค้าด้วย Barcode =====
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

// ===== Model Function: บันทึกการรับเข้าสินค้า =====
exports.recordReceiving = async ({ user_id, receiving_note, stockin_type, source_name, receivingItems }) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // ✅ gen เลขเอกสารใหม่ เช่น STI-YYYYMMDD-xxxx
        const stockin_no = await generateStockinCode(client);

        // ───────────── INSERT HEADER ─────────────
        const insertReceiving = await client.query(
            `INSERT INTO stock_ins (
                stockin_date, user_id, note, stockin_type, stockin_no, created_at
             )
             VALUES (NOW(), $1, $2, $3, $4, NOW())
             RETURNING stockin_id, stockin_no`,
            [user_id, receiving_note || null, stockin_type || "general", stockin_no]
        );

        const newStockinId = insertReceiving.rows[0].stockin_id;

        // ───────────── INSERT DETAILS & LOT ─────────────
        for (const item of receivingItems) {
            if (!item.item_id) throw new Error(`Missing item_id`);
            if (!item.quantity || item.quantity <= 0)
                throw new Error(`Invalid quantity for item_id ${item.item_id}`);

            // ✅ ใช้ lot ที่ user กรอก ถ้าไม่มีให้ gen ใหม่
            const lotToUse = item.lotNo?.trim() || await generateLotNo(client, item.item_id);

            // 1) เช็คว่ามี lot เดิมหรือยัง
            const { rows: existLot } = await client.query(
                `SELECT lot_id FROM item_lots 
                 WHERE item_id = $1 AND lot_no = $2`,
                [item.item_id, lotToUse]
            );

            let lotId;
            if (existLot.length) {
                // 🔹 ถ้ามี lot เดิม → update qty
                await client.query(
                    `UPDATE item_lots
                     SET qty_imported = qty_imported + $1,
                         qty_remaining = qty_remaining + $1
                     WHERE lot_id = $2`,
                    [item.quantity, existLot[0].lot_id]
                );
                lotId = existLot[0].lot_id;
            } else {
                // 🔹 ถ้าไม่มี lot เดิม → insert ใหม่
                const lotRes = await client.query(
                    `INSERT INTO item_lots 
                        (item_id, stockin_id, lot_no, qty_imported, qty_remaining, mfg_date, exp_date, import_date, created_by, document_no)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8,$9)
                     RETURNING lot_id`,
                    [
                        item.item_id,
                        newStockinId,
                        lotToUse,
                        item.quantity,
                        item.quantity,
                        item.mfgDate || null,
                        normalizeDate(item.expiryDate),
                        user_id,
                        item.documentNo || null
                    ]
                );
                lotId = lotRes.rows[0].lot_id;
            }

            // 2) เพิ่ม detail (บันทึก history ว่าเข้ามากี่ชิ้น)
            await client.query(
                `INSERT INTO stock_in_details 
                    (stockin_id, item_id, lot_id, qty, unit, note)
                 VALUES ($1,$2,$3,$4,$5,$6)`,
                [
                    newStockinId,
                    item.item_id,
                    lotId,
                    item.quantity,
                    item.item_unit || null,
                    item.notes || null
                ]
            );
        }

        await client.query("COMMIT");
        return { success: true, stockin_id: newStockinId, stockin_no };
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ Error in recordReceiving:", err);
        throw err;
    } finally {
        client.release();
    }
};
