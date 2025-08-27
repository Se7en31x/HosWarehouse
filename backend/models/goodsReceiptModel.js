// models/goodsReceiptModel.js
const { generateStockinCode } = require("../utils/stockinCounter");

// ===== Helper: Generate Lot No =====
async function generateLotNo(client, item_id) {
  const { rows } = await client.query(
    `SELECT item_category FROM items WHERE item_id = $1`,
    [item_id]
  );
  if (!rows.length) throw new Error(`Item not found: ${item_id}`);

  const category = rows[0].item_category;

  // ✅ กำหนด prefix ตามหมวด
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

// ===== Get GR List =====
async function getAllGoodsReceipts() {
  const sql = `
    SELECT gr.gr_id, gr.gr_no, gr.gr_date, gr.status,
           po.po_no, po.supplier_name, po.supplier_id
    FROM goods_receipts gr
    LEFT JOIN purchase_orders po ON gr.po_id = po.po_id
    ORDER BY gr.created_at DESC
  `;
  const { rows } = await pool.query(sql);
  return rows;
}

// ===== Get GR Detail =====
async function getGoodsReceiptById(grId) {
  const sql = `
    SELECT gr.*, po.po_no, po.supplier_name, po.supplier_address,
           po.supplier_phone, po.supplier_email, po.supplier_tax_id
    FROM goods_receipts gr
    LEFT JOIN purchase_orders po ON gr.po_id = po.po_id
    WHERE gr.gr_id = $1
  `;
  const { rows } = await pool.query(sql, [grId]);
  if (rows.length === 0) return null;

  // ดึงรายการสินค้า + lot
  const sqlItems = `
    SELECT gri.*, i.item_name, i.item_unit, l.lot_no, l.mfg_date, l.exp_date
    FROM goods_receipt_items gri
    LEFT JOIN items i ON gri.item_id = i.item_id
    LEFT JOIN item_lots l ON gri.lot_id = l.lot_id
    WHERE gri.gr_id = $1
  `;
  const { rows: items } = await pool.query(sqlItems, [grId]);
  rows[0].items = items;

  return rows[0];
}

// ===== Create GR =====
async function createGoodsReceipt(client, grData) {
  try {
    const grNo = `GR-${Date.now()}`;

    // insert GR header
    const grRes = await client.query(
      `INSERT INTO goods_receipts (gr_no, po_id, gr_date, delivery_no, invoice_no, status, created_by, created_at)
       VALUES ($1,$2,$3,$4,$5,'completed',$6,NOW())
       RETURNING gr_id, gr_no`,
      [
        grNo,
        grData.po_id,
        grData.receipt_date,
        grData.delivery_no,
        grData.invoice_no,
        grData.user_id || 1
      ]
    );

    const gr_id = grRes.rows[0].gr_id;

    // ✅ สร้าง stock_in header
    const stockinNo = await generateStockinCode(client);
    const stockInRes = await client.query(
      `INSERT INTO stock_ins (stockin_no, stockin_date, stockin_type, po_id, note, user_id, created_at)
       VALUES ($1, NOW(), 'purchase', $2, $3, $4, NOW())
       RETURNING stockin_id`,
      [stockinNo, grData.po_id, grData.note || "", grData.user_id || 1]
    );
    const stockin_id = stockInRes.rows[0].stockin_id;

    // insert GR items + จัดการ lot
    for (const item of grData.items) {
      if (item.qty_received > 0) {
        // ถ้า user ไม่กรอก lot → gen ใหม่
        let lotNo = item.lot_no?.trim();
        if (!lotNo) {
          lotNo = await generateLotNo(client, item.item_id);
        }

        // ตรวจว่า lot นี้มีอยู่แล้วไหม
        const { rows: existLot } = await client.query(
          `SELECT lot_id FROM item_lots WHERE item_id=$1 AND lot_no=$2`,
          [item.item_id, lotNo]
        );

        let lot_id;
        if (existLot.length > 0) {
          // 👉 ถ้ามี lot เดิม → update qty
          await client.query(
            `UPDATE item_lots 
             SET qty_imported = qty_imported + $1,
                 qty_remaining = qty_remaining + $1
             WHERE lot_id=$2`,
            [item.qty_received, existLot[0].lot_id]
          );
          lot_id = existLot[0].lot_id;
        } else {
          // 👉 ถ้าไม่มี lot เดิม → insert ใหม่
          const lotRes = await client.query(
            `INSERT INTO item_lots (item_id, lot_no, qty_imported, qty_remaining, mfg_date, exp_date, import_date, created_by, document_no, unit_cost)
             VALUES ($1,$2,$3,$3,$4,$5,NOW(),$6,$7,$8)
             RETURNING lot_id`,
            [
              item.item_id,
              lotNo,
              item.qty_received,
              item.mfg_date || null,
              item.expiry_date || null,
              grData.user_id || 1,
              grNo,
              item.unit_cost || 0,
            ]
          );
          lot_id = lotRes.rows[0].lot_id;
        }

        // insert goods_receipt_items
        await client.query(
          `INSERT INTO goods_receipt_items (gr_id, po_item_id, item_id, qty_ordered, qty_received, lot_id, status, note)
           SELECT $1, poi.po_item_id, poi.item_id, poi.quantity, $2, $3, 'received', $4
           FROM purchase_order_items poi WHERE poi.po_item_id=$5`,
          [gr_id, item.qty_received, lot_id, item.note || "", item.po_item_id]
        );

        // insert stock_in_details
        await client.query(
          `INSERT INTO stock_in_details (stockin_id, item_id, lot_id, qty, unit, note)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [stockin_id, item.item_id, lot_id, item.qty_received, item.unit, item.note || ""]
        );
      }
    }

    return grRes.rows[0];
  } catch (err) {
    throw err;
  }
}

module.exports = {
  getAllGoodsReceipts,
  getGoodsReceiptById,
  createGoodsReceipt,
};
