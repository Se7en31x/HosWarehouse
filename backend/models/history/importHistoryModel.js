const { pool } = require('../../config/db'); 

exports.getAllImport = async () => {
  const query = `
    SELECT 
        i.import_id,
        i.import_no,
        i.import_date,
        COALESCE(i.import_type, 'general') AS import_type,
        COALESCE(s.supplier_name, i.source_name, '-') AS source_name,
        (u.user_fname || ' ' || u.user_lname) AS imported_by,
        i.import_status,
        i.import_note,

        -- ✅ รวม details เป็น array JSON
        json_agg(
          json_build_object(
            'item_name', it.item_name,
            'item_unit', it.item_unit,
            'quantity', d.quantity,
            'import_price', d.import_price,
            'exp_date', d.exp_date,
            'lot_no', l.lot_no,
            'mfg_date', l.mfg_date,

            -- 🔹 ถ้าเป็นของซ่อมคืน
            'damaged_id', di.damaged_id,
            'damage_note', di.damaged_note,
            'damage_type', di.damage_type,
            'repaired_qty', di.repaired_qty,

            -- 🔹 ถ้าเป็นการคืนจากการยืม
            'return_id', br.return_id,
            'condition', br.condition,
            'request_code', rq.request_code
          )
        ) AS details

    FROM imports i
    JOIN import_details d ON i.import_id = d.import_id
    JOIN items it ON d.item_id = it.item_id
    LEFT JOIN suppliers s ON i.supplier_id = s.supplier_id
    LEFT JOIN users u ON i.user_id = u.user_id
    LEFT JOIN item_lots l 
      ON d.import_id = l.import_id 
      AND d.item_id = l.item_id

    -- ✅ join ข้อมูล damaged_items เฉพาะกรณี repair_return
    LEFT JOIN damaged_items di
      ON i.import_type = 'repair_return' 
      AND i.source_type = 'damaged_items'
      AND i.source_ref_id = di.damaged_id

    -- ✅ join ข้อมูล borrow_returns เฉพาะกรณีคืนจากการยืม
    LEFT JOIN borrow_returns br
      ON i.import_type = 'return'
      AND i.source_type = 'borrow_return'
      AND i.source_ref_id = br.return_id

    LEFT JOIN requests rq
      ON br.request_detail_id = rq.request_id

    GROUP BY i.import_id, i.import_no, i.import_date, i.import_type, 
             s.supplier_name, i.source_name, u.user_fname, u.user_lname, 
             i.import_status, i.import_note
    ORDER BY i.import_date DESC, i.import_id DESC;
  `;
  const { rows } = await pool.query(query);
  return rows;
};
