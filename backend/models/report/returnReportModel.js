// backend/models/report/returnReportModel.js
const { pool } = require("../../config/db");

exports.getReturnReport = async (filters) => {
    console.log('Received filters:', filters);

    const { department, start, end, approvalStatus } = filters;
    const params = [];
    let whereClause = "WHERE r.request_type = 'borrow'";

    console.log('Filtering by department:', department);
    if (department && department !== "all") {
        params.push(department);
        whereClause += ` AND d.department_id = $${params.length}`;
    }

    // ใช้ br.return_date แทน r.request_date
    console.log('Filtering by return date range:', { start, end });
    if (start && end) {
        console.log('Date range start:', start);
        console.log('Date range end:', end);
        
        params.push(start, end);
        whereClause += ` AND br.return_date::date BETWEEN $${params.length - 1} AND $${params.length}`;
    }

    if (approvalStatus && approvalStatus !== "all") {
        console.log('Filtering by approvalStatus:', approvalStatus);
        params.push(approvalStatus);
        whereClause += ` AND rd.approval_status = $${params.length}`;
    }

    const query = `
      SELECT 
        r.request_code,
        i.item_name,
        rd.approved_qty,
        rd.approval_status,
        rd.expected_return_date,
        COALESCE(SUM(brl.qty), 0) AS returned_qty,
        GREATEST(rd.approved_qty - COALESCE(SUM(brl.qty), 0), 0) AS not_returned_qty,
        MAX(br.return_date) AS last_return_date,
        CASE
          WHEN rd.approval_status ILIKE 'reject%' THEN 'ปฏิเสธ'
          WHEN COALESCE(SUM(brl.qty), 0) = 0 THEN 'ยังไม่คืน'
          WHEN COALESCE(SUM(brl.qty), 0) < rd.approved_qty THEN 'คืนบางส่วน'
          ELSE 'คืนครบ'
        END AS return_status,
        d.department_name_th AS department,
        (u.firstname || ' ' || u.lastname) AS borrower_name,
        MAX(br.return_note) AS return_note
      FROM request_details rd
      JOIN requests r ON rd.request_id = r.request_id
      JOIN items i ON rd.item_id = i.item_id
      JOIN "Admin".users u ON r.user_id = u.user_id
      LEFT JOIN "Admin".user_departments ud ON u.user_id = ud.user_id
      LEFT JOIN "Admin".departments d ON ud.department_id = d.department_id
      LEFT JOIN borrow_returns br ON rd.request_detail_id = br.request_detail_id
      LEFT JOIN borrow_return_lots brl ON br.return_id = brl.return_id
      ${whereClause}
      GROUP BY r.request_code, i.item_name, rd.approved_qty, rd.approval_status, rd.expected_return_date, d.department_name_th, borrower_name
      ORDER BY last_return_date DESC NULLS LAST;
    `;

    console.log('Final Query:', query);
    console.log('Query Parameters:', params);

    const { rows } = await pool.query(query, params);
    return rows;
};
