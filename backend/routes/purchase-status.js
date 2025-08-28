const express = require("express");
const router = express.Router();
const { pool } = require("../config/db");

// ✅ API: ติดตามสถานะคำขอซื้อ (ฝ่ายคลัง)
router.get("/purchase-status", async (req, res) => {
  try {
    const sql = `
      SELECT 
          pr.pr_no,
          pr.created_at AS request_date,
          i.item_name,
          i.item_category,     
          i.item_unit,         
          pri.qty_requested,
          po.po_no,
          s.supplier_name,
          COALESCE(SUM(gri.qty_received),0)::int AS received_qty,
          (pri.qty_requested - COALESCE(SUM(gri.qty_received),0))::int AS remaining_qty,
          CASE 
              WHEN pri.qty_requested = COALESCE(SUM(gri.qty_received),0) THEN 'Completed'
              WHEN COALESCE(SUM(gri.qty_received),0) > 0 THEN 'Processing'
              ELSE 'Pending'
          END AS status
      FROM purchase_request_items pri
      JOIN purchase_requests pr ON pri.pr_id = pr.pr_id
      JOIN items i ON pri.item_id = i.item_id
      LEFT JOIN rfq_items rfi ON rfi.pr_item_id = pri.pr_item_id
      LEFT JOIN request_for_quotations rfq ON rfq.rfq_id = rfi.rfq_id
      LEFT JOIN purchase_orders po ON po.rfq_id = rfq.rfq_id
      LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
      LEFT JOIN purchase_order_items poi 
        ON poi.po_id = po.po_id AND poi.item_id = i.item_id
      LEFT JOIN goods_receipt_items gri 
        ON gri.po_item_id = poi.po_item_id
      GROUP BY pr.pr_no, pr.created_at, i.item_name, i.item_category, i.item_unit, pri.qty_requested, po.po_no, s.supplier_name
      ORDER BY pr.created_at DESC;
    `;

    const { rows } = await pool.query(sql);

    // ✅ map class สำหรับ CSS
    const result = rows.map(r => ({
      ...r,
      statusClass: r.status.toLowerCase()
    }));

    res.json(result);
  } catch (err) {
    console.error("Error fetching purchase status:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
