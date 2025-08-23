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
        u.user_fname || ' ' || u.user_lname AS requester_name,
        u.department,

        -- ✅ ผู้อนุมัติ
        approver.user_fname || ' ' || approver.user_lname AS approved_by_name,
        r.approved_at,
        
        -- ✅ ดึงรายละเอียดรายการยืม (รวมถึง lot, การคืน, และสรุปสถานะ)
        json_agg(
            json_build_object(
                'item_id', i.item_id,
                'item_name', i.item_name,
                'requested_qty', rd.requested_qty,
                'approved_qty', rd.approved_qty,
                'unit', i.item_unit,
                'processing_status', rd.processing_status,
                'borrow_status', rd.borrow_status,       
                'expected_return_date', rd.expected_return_date,
                'actual_deducted_qty', rd.actual_deducted_qty,

                -- ✅ จำนวนที่คืนแล้ว
                'returned_total', (
                  SELECT COALESCE(SUM(br.return_qty),0)
                  FROM borrow_returns br
                  WHERE br.request_detail_id = rd.request_detail_id
                ),

                -- ✅ จำนวนคงค้าง
                'remaining_qty', (
                  rd.actual_deducted_qty - 
                  COALESCE((
                    SELECT SUM(br.return_qty)
                    FROM borrow_returns br
                    WHERE br.request_detail_id = rd.request_detail_id
                  ),0)
                ),

                -- ✅ สรุปสถานะการคืน
                'return_overall_status', (
                  CASE 
                    WHEN COALESCE((
                      SELECT SUM(br.return_qty)
                      FROM borrow_returns br
                      WHERE br.request_detail_id = rd.request_detail_id
                    ),0) = 0 THEN 'not_returned'
                    WHEN COALESCE((
                      SELECT SUM(br.return_qty)
                      FROM borrow_returns br
                      WHERE br.request_detail_id = rd.request_detail_id
                    ),0) < rd.actual_deducted_qty THEN 'partially_returned'
                    ELSE 'returned_complete'
                  END
                ),

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
                                'return_qty', br.return_qty,
                                'return_status', br.return_status,
                                'condition', br.condition,
                                'return_note', br.return_note,
                                'inspected_by_name', inspector.user_fname || ' ' || inspector.user_lname
                            )
                            ORDER BY br.return_date DESC
                        )
                    FROM borrow_returns br
                    LEFT JOIN users inspector ON br.inspected_by = inspector.user_id
                    WHERE br.request_detail_id = rd.request_detail_id
                )
            ) ORDER BY i.item_name
        ) AS details

    FROM requests r
    JOIN users u ON r.user_id = u.user_id
    LEFT JOIN users approver ON r.approved_by = approver.user_id  -- ✅ join ผู้อนุมัติ
    JOIN request_details rd ON r.request_id = rd.request_id
    JOIN items i ON rd.item_id = i.item_id

    -- ✅ กรองเฉพาะคำขอประเภท 'borrow'
    WHERE r.request_type = 'borrow'
      AND r.request_status NOT IN ('draft', 'canceled')

    GROUP BY 
        r.request_id, r.request_code, r.request_date, r.request_status, r.request_type, 
        r.is_urgent, u.user_fname, u.user_lname, u.department,
        approver.user_fname, approver.user_lname, r.approved_at
    
    ORDER BY r.request_date DESC;
  `;

  const { rows } = await pool.query(query);
  return rows;
};
