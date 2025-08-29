const { pool } = require('../../config/db');

/**
 * ดึงข้อมูลเอกสารนำเข้าพัสดุ (stock-in) ทั้งหมด
 * พร้อมแสดงชื่อผู้ขายและเลขที่ Lot ที่ถูกต้อง
 */
exports.getAllStockins = async () => {
    const query = `
        SELECT
            si.stockin_id,
            si.stockin_no,
            si.stockin_date,
            si.stockin_type,
            -- ✅ ใช้ COALESCE เพื่อเลือกชื่อแหล่งที่มาอย่างเหมาะสม
            COALESCE(
                s.supplier_name,  -- ชื่อผู้ขายจากตาราง suppliers (กรณีรับเข้าจาก PO)
                (u.user_fname || ' ' || u.user_lname), -- ชื่อผู้ใช้ที่คืนของ (กรณี return, repair_return)
                si.note  -- หรือแสดง note ถ้าไม่มีข้อมูลอื่น
            ) AS source_name,
            (u.user_fname || ' ' || u.user_lname) AS user_name,
            'posted' AS stockin_status,
            si.note AS stockin_note,
            json_agg(
                json_build_object(
                    'item_name', it.item_name,
                    'item_unit', it.item_unit,
                    'qty', sid.qty,
                    'note', sid.note,
                    -- ✅ เชื่อมกับตาราง item_lots เพื่อดึง lot_no
                    'lot_no', l.lot_no
                )
            ) AS details
        FROM stock_ins si
        JOIN stock_in_details sid ON si.stockin_id = sid.stockin_id
        JOIN items it ON sid.item_id = it.item_id
        LEFT JOIN users u ON si.user_id = u.user_id
        
        -- ✅ แก้ไขการเชื่อม: LEFT JOIN item_lots l (ไม่ใช่ lots)
        LEFT JOIN item_lots l ON sid.lot_id = l.lot_id
        
        -- ✅ LEFT JOIN หลายชั้นเพื่อดึงชื่อผู้ขายสำหรับรายการประเภท 'purchase'
        LEFT JOIN goods_receipts gr ON si.gr_id = gr.gr_id AND si.stockin_type = 'purchase'
        LEFT JOIN purchase_orders po ON gr.po_id = po.po_id AND si.stockin_type = 'purchase'
        LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id AND si.stockin_type = 'purchase'

        GROUP BY
            si.stockin_id,
            si.stockin_no,
            si.stockin_date,
            si.stockin_type,
            si.note,
            u.user_fname,
            u.user_lname,
            s.supplier_name
        ORDER BY
            si.stockin_date DESC,
            si.stockin_id DESC;
    `;

    try {
        const { rows } = await pool.query(query);
        return rows;
    } catch (err) {
        console.error("Error fetching stockin history:", err);
        throw err;
    }
};
