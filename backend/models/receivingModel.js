const { pool } = require("../config/db");
const { generateStockinCode } = require("../utils/stockinCounter");
const { getIO } = require("../socket");
const inventoryModel = require('./inventoryModel');

// ===== Helper: normalize date value =====
function normalizeDate(value) {
    if (!value || (typeof value === "string" && value.trim() === "")) {
        return null;
    }
    return value;
}

// ===== Helper: Generate Lot No =====
async function generateLotNo(client, item_id) {
    const { rows } = await client.query(
        `SELECT item_category FROM items WHERE item_id = $1`, [item_id]
    );
    if (!rows.length) throw new Error(`Item not found: ${item_id}`);

    const category = rows[0].item_category;

    let prefix;
    switch (category) {
        case "medicine": prefix = "MED"; break;
        case "medsup": prefix = "SUP"; break;
        case "equipment": prefix = "EQP"; break;
        case "meddevice": prefix = "MDV"; break;
        case "general": prefix = "GEN"; break;
        default: prefix = "UNK";
    }

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");

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
async function getAllItems() {
    const query = `
        SELECT
            i.item_id,
            i.item_name,
            i.item_unit,
            i.item_purchase_unit,
            i.item_category, 
            i.item_sub_category,
            i.item_barcode,
            i.item_min,
            i.item_max,
            COALESCE(SUM(l.qty_remaining),0) AS current_stock
        FROM items AS i
        LEFT JOIN item_lots l 
            ON i.item_id = l.item_id
           AND (l.is_expired = false OR l.is_expired IS NULL)
           AND (l.exp_date IS NULL OR l.exp_date >= CURRENT_DATE)
           AND l.qty_remaining > 0
        WHERE i.is_deleted = false
        GROUP BY i.item_id, i.item_name, i.item_unit, i.item_purchase_unit,
                 i.item_category, i.item_sub_category, i.item_barcode, i.item_min, i.item_max
        ORDER BY i.item_name ASC;
    `;
    const result = await pool.query(query);
    return result.rows;
}

// ===== Model Function: ค้นหาสินค้าด้วย Barcode =====
async function findItemByBarcode(barcode) {
    console.log("🔎 Barcode from scanner:", JSON.stringify(barcode));
    const cleanBarcode = (barcode || "").trim();

    const query = `
        SELECT
            i.item_id,
            i.item_name,
            i.item_unit,
            i.item_purchase_unit,
            i.item_conversion_rate,
            i.item_category,
            i.item_sub_category,
            i.item_barcode
        FROM items AS i
        WHERE i.item_barcode = $1
          AND i.is_deleted = false
        LIMIT 1;
    `;
    const result = await pool.query(query, [cleanBarcode]);
    return result.rows[0] || null;
}

// ===== Model Function: บันทึกการรับเข้าสินค้า =====
async function recordReceiving({ user_id, receiving_note, stockin_type, source_name, receivingItems }) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const stockin_no = await generateStockinCode(client);

        const insertReceiving = await client.query(
            `INSERT INTO stock_ins (
        stockin_date, user_id, note, stockin_type, stockin_no, created_at, source_name, stockin_status
     )
     VALUES (NOW(), $1, $2, $3, $4, NOW(), $5, 'posted')
     RETURNING stockin_id, stockin_no, stockin_status`,
            [user_id, receiving_note || null, stockin_type || "general", stockin_no, source_name || null]
        );  

        const newStockinId = insertReceiving.rows[0].stockin_id;

        for (const item of receivingItems) {
            if (!item.item_id) throw new Error(`Missing item_id`);
            if (!item.quantity || item.quantity <= 0)
                throw new Error(`Invalid quantity for item_id ${item.item_id}`);

            const { rows: itemInfo } = await client.query(
                `SELECT item_unit FROM items WHERE item_id = $1`, [item.item_id]
            );
            const itemUnit = itemInfo[0]?.item_unit || 'ชิ้น';

            const lotToUse = item.lotNo?.trim() || await generateLotNo(client, item.item_id);

            const { rows: existLot } = await client.query(
                `SELECT lot_id FROM item_lots 
                 WHERE item_id = $1 AND lot_no = $2`,
                [item.item_id, lotToUse]
            );

            let lotId;
            if (existLot.length) {
                await client.query(
                    `UPDATE item_lots
                     SET qty_imported = qty_imported + $1,
                         qty_remaining = qty_remaining + $1,
                         exp_date = COALESCE($2, exp_date)
                     WHERE lot_id = $3`,
                    [item.quantity, normalizeDate(item.expiryDate), existLot[0].lot_id]
                );
                lotId = existLot[0].lot_id;
            } else {
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
                        normalizeDate(item.mfgDate),
                        normalizeDate(item.expiryDate),
                        user_id,
                        item.documentNo || null
                    ]
                );
                lotId = lotRes.rows[0].lot_id;
            }

            await client.query(
                `INSERT INTO stock_in_details 
                    (stockin_id, item_id, lot_id, qty, unit, note)
                 VALUES ($1,$2,$3,$4,$5,$6)`,
                [
                    newStockinId,
                    item.item_id,
                    lotId,
                    item.quantity,
                    item.unit || itemUnit,
                    item.notes || null
                ]
            );

            const { rows: currentBalanceRows } = await client.query(
                `SELECT COALESCE(SUM(qty_remaining), 0) AS total_balance FROM item_lots WHERE item_id = $1`,
                [item.item_id]
            );
            const balanceAfter = currentBalanceRows[0].total_balance;

            // ✅ ส่วนนี้คือการลบโค้ดที่ไม่จำเป็นออกไปครับ
            // await client.query(
            //     `UPDATE items
            //      SET total_on_hand_qty = (
            //          SELECT COALESCE(SUM(qty_remaining), 0)
            //          FROM item_lots
            //          WHERE item_id = $1
            //      )
            //      WHERE item_id = $1`,
            //     [item.item_id]
            // );

        }

        await client.query("COMMIT");

        const io = getIO();
        if (io) {
            for (const item of receivingItems) {
                const updatedItem = await inventoryModel.getItemById(item.item_id);
                if (updatedItem) {
                    io.emit("itemUpdated", {
                        item_id: updatedItem.item_id,
                        item_name: updatedItem.item_name,
                        item_unit: updatedItem.item_unit,
                        item_img: updatedItem.item_img,
                        current_stock: updatedItem.total_on_hand_qty,
                    });
                }
            }
        }

        return { success: true, stockin_id: newStockinId, stockin_no };
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ Error in recordReceiving:", err);
        throw err;
    } finally {
        client.release();
    }
}

// ===== Export all functions =====
module.exports = {
    getAllItems,
    findItemByBarcode,
    recordReceiving
};