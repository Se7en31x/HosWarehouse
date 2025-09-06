const { pool } = require("../../config/db");

exports.getAllBorrow = async () => {
  const query = `
    SELECT
      r.request_id,
      r.request_code,
      r.request_date,
      r.request_status,
      r.is_urgent,
      r.request_due_date,
      r.request_type, 
      r.request_note,

      -- ✅ ผู้ร้องขอ
      u.firstname || ' ' || u.lastname AS requester_name,

      -- ✅ แผนกที่เลือกตอนสร้าง request
      r.department_id,
      d.department_name_th AS department_name,

      -- ✅ ผู้อนุมัติ
      approver.firstname || ' ' || approver.lastname AS approved_by_name,
      r.approved_at,
      
      -- ✅ ดึงรายละเอียดรายการยืม
      json_agg(
          json_build_object(
              'request_detail_id', rd.request_detail_id,
              'item_id', i.item_id,
              'item_name', i.item_name,
              'requested_qty', rd.requested_qty,
              'approved_qty', rd.approved_qty,
              'item_unit', i.item_unit,
              'processing_status', rd.processing_status,
              'borrow_status', rd.borrow_status, 
              'expected_return_date', rd.expected_return_date,
              'actual_deducted_qty', rd.actual_deducted_qty,

              -- ✅ คำนวณจำนวนที่คืนแล้ว
              'returned_total', COALESCE((
                SELECT SUM(br.return_qty)
                FROM borrow_returns br
                WHERE br.request_detail_id = rd.request_detail_id
              ), 0),

              -- ✅ รายละเอียด lot ที่ถูกตัดออกในการยืม
              'lots', (
                SELECT json_agg(
                    json_build_object(
                        'borrow_detail_lot_id', bdl.borrow_detail_lot_id,
                        'lot_id', bdl.lot_id,
                        'lot_no', il.lot_no,
                        'exp_date', il.exp_date,
                        'qty', bdl.qty
                    )
                )
                FROM borrow_detail_lots bdl
                JOIN item_lots il ON il.lot_id = bdl.lot_id
                WHERE bdl.request_detail_id = rd.request_detail_id
              ),

              -- ✅ ประวัติการคืน
              'returns', (
                  SELECT 
                      json_agg(
                          json_build_object(
                              'return_id', br.return_id,
                              'return_date', br.return_date,
                              'qty', br.return_qty,
                              'condition', br.condition,
                              'return_note', br.return_note,
                              'inspected_by_name', inspector.firstname || ' ' || inspector.lastname
                          )
                          ORDER BY br.return_date DESC
                      )
                  FROM borrow_returns br
                  LEFT JOIN "Admin".users inspector ON br.inspected_by = inspector.user_id
                  WHERE br.request_detail_id = rd.request_detail_id
              )
          ) ORDER BY i.item_name
      ) AS details

    FROM requests r
    JOIN "Admin".users u ON r.user_id = u.user_id
    LEFT JOIN "Admin".departments d ON r.department_id = d.department_id
    LEFT JOIN "Admin".users approver ON r.approved_by = approver.user_id 
    JOIN request_details rd ON r.request_id = rd.request_id
    JOIN items i ON rd.item_id = i.item_id

    WHERE r.request_type = 'borrow'
      AND r.request_status NOT IN ('draft', 'canceled')

    GROUP BY 
      r.request_id, r.request_code, r.request_date, r.request_status, r.request_type, 
      r.is_urgent, r.request_due_date, r.request_note,
      u.firstname, u.lastname, r.department_id, d.department_name_th,
      approver.firstname, approver.lastname, r.approved_at
    
    ORDER BY r.request_date DESC;
  `;

  const { rows } = await pool.query(query);
  return rows;
};
