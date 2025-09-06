const { pool } = require('../../config/db');

exports.getAllStockins = async () => {
  const query = `
    SELECT 
        si.stockin_id,
        si.stockin_no,
        si.stockin_date,
        si.stockin_type,
        si.note AS stockin_note,
        si.stockin_status,

        -- แหล่งที่มา
        COALESCE(
            s.supplier_name,
            si.source_name,
            (u.firstname || ' ' || u.lastname)
        ) AS source_name,

        -- ผู้ทำรายการ
        (u.firstname || ' ' || u.lastname) AS user_name,

        -- หมายเหตุจาก goods_receipts (ถ้ามี)
        gr.import_note AS gr_note,

        -- รวมจำนวน
        COUNT(sid.stockin_detail_id) AS total_items,
        COALESCE(SUM(sid.qty),0) AS total_qty,

        -- รายละเอียด
        COALESCE(
          json_agg(
            json_build_object(
              'item_name', it.item_name,
              'unit', sid.unit,
              'qty', sid.qty,
              'lot_no', COALESCE(l.lot_no, '-'),
              'mfg_date', l.mfg_date,
              'exp_date', l.exp_date,
              'note', sid.note
            )
            ORDER BY sid.stockin_detail_id
          ) FILTER (WHERE sid.stockin_detail_id IS NOT NULL),
          '[]'
        ) AS details

    FROM stock_ins si
    JOIN stock_in_details sid ON si.stockin_id = sid.stockin_id
    JOIN items it ON sid.item_id = it.item_id
    LEFT JOIN item_lots l ON sid.lot_id = l.lot_id
    LEFT JOIN "Admin".users u ON si.user_id = u.user_id   -- ✅ เปลี่ยน schema
    LEFT JOIN goods_receipts gr ON si.gr_id = gr.gr_id
    LEFT JOIN purchase_orders po ON gr.po_id = po.po_id
    LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id

    GROUP BY 
      si.stockin_id, si.stockin_no, si.stockin_date, si.stockin_type,
      si.note, si.source_name, si.stockin_status,
      u.firstname, u.lastname,
      s.supplier_name, gr.import_note

    ORDER BY si.stockin_date DESC, si.stockin_id DESC;
  `;

  try {
    const { rows } = await pool.query(query);
    return rows;
  } catch (err) {
    console.error("Error fetching stockin history:", err);
    throw err;
  }
};
