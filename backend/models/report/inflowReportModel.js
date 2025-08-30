// backend/models/report/inflowReportModel.js
const { pool } = require("../../config/db");

exports.getInflowReport = async (filters) => {
  const { type, department, dateRange } = filters;

  const params = [];
  let whereClause = "WHERE 1=1";

  if (type && type !== "all") {
    params.push(type);
    whereClause += ` AND inflow_type = $${params.length}`;
  }

  if (department && department !== "all") {
    params.push(department);
    whereClause += ` AND department = $${params.length}`;
  }

  if (dateRange?.start && dateRange?.end) {
    params.push(dateRange.start, dateRange.end);
    whereClause += ` AND doc_date BETWEEN $${params.length - 1} AND $${params.length}`;
  }

  const query = `
    SELECT * FROM (
      -- ✅ รับเข้าทั่วไป
      SELECT 
        s.stockin_no AS doc_no,
        s.stockin_date AS doc_date,
        i.item_name,
        i.item_category AS category,
        sid.qty,
        sid.unit,
        s.stockin_type AS inflow_type,
        u.department,
        NULL::text AS supplier_name,
        l.lot_no
      FROM stock_ins s
      JOIN stock_in_details sid ON s.stockin_id = sid.stockin_id
      JOIN items i ON sid.item_id = i.item_id
      LEFT JOIN item_lots l ON sid.lot_id = l.lot_id   -- ✅ lot
      LEFT JOIN users u ON s.user_id = u.user_id
      WHERE s.stockin_type <> 'purchase'

      UNION ALL

      -- ✅ รับเข้าจากการสั่งซื้อ (GR)
      SELECT 
        gr.gr_no AS doc_no,
        gr.gr_date AS doc_date,
        i.item_name,
        i.item_category AS category,
        gri.qty_received AS qty,
        poi.unit,
        'purchase' AS inflow_type,
        pr.department,
        po.supplier_name,
        l.lot_no
      FROM goods_receipts gr
      JOIN goods_receipt_items gri ON gr.gr_id = gri.gr_id
      JOIN items i ON gri.item_id = i.item_id
      JOIN purchase_order_items poi ON gri.po_item_id = poi.po_item_id
      LEFT JOIN purchase_orders po ON gr.po_id = po.po_id
      LEFT JOIN purchase_requests pr ON po.pr_id = pr.pr_id
      LEFT JOIN item_lots l ON gri.lot_id = l.lot_id   -- ✅ lot
    ) sub
    ${whereClause}
    ORDER BY doc_date DESC
  `;

  const result = await pool.query(query, params);
  return result.rows;
};
