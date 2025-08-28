const { pool } = require("../config/db");

// ===== RFQ (list + detail)
async function getRFQHistory(){
  const sql=`
    SELECT rfq.rfq_id, rfq.rfq_no, rfq.created_at, rfq.status,
           COUNT(ri.rfq_item_id) AS total_items,
           COUNT(DISTINCT ri.pr_id) AS total_pr
    FROM request_for_quotations rfq
    LEFT JOIN rfq_items ri ON ri.rfq_id = rfq.rfq_id
    GROUP BY rfq.rfq_id
    ORDER BY rfq.created_at DESC;
  `;
  return (await pool.query(sql)).rows;
}
async function getRFQItems(rfqId){
  const sql=`
    SELECT ri.rfq_item_id, ri.pr_id, ri.pr_item_id, i.item_id, i.item_name,
           ri.qty, ri.unit, ri.spec
    FROM rfq_items ri
    JOIN purchase_request_items pri ON pri.pr_item_id = ri.pr_item_id
    JOIN items i ON i.item_id = pri.item_id
    WHERE ri.rfq_id = $1
    ORDER BY i.item_name ASC;
  `;
  return (await pool.query(sql,[rfqId])).rows;
}

// ===== PO (list)
async function getPOHistory(){
  const sql=`
    SELECT po.po_id, po.po_no, po.po_date, po.supplier_name,
           po.grand_total, po.status,
           COUNT(poi.po_item_id) AS total_items,
           COALESCE(SUM(poi.qty_received_total),0) AS received_items,
           COALESCE( (SELECT COUNT(DISTINCT ri.pr_id)
                      FROM rfq_items ri WHERE ri.rfq_id = po.rfq_id), 0) AS source_pr_count,
           COALESCE( (SELECT COUNT(ri.rfq_item_id)
                      FROM rfq_items ri WHERE ri.rfq_id = po.rfq_id), 0) AS source_pr_items
    FROM purchase_orders po
    LEFT JOIN purchase_order_items poi ON poi.po_id = po.po_id
    GROUP BY po.po_id
    ORDER BY po.po_date DESC;
  `;
  return (await pool.query(sql)).rows;
}

// ===== PO (detail)
async function getPOItems(poId){
  const sql=`
    SELECT poi.po_item_id, i.item_id, i.item_name,
           poi.quantity AS ordered_qty, poi.unit, poi.price, poi.total,
           COALESCE(poi.qty_received_total,0) AS received_qty,
           (poi.quantity - COALESCE(poi.qty_received_total,0)) AS remaining_qty,
           poi.receive_status
    FROM purchase_order_items poi
    JOIN items i ON i.item_id = poi.item_id
    WHERE poi.po_id = $1
    ORDER BY i.item_name ASC;
  `;
  return (await pool.query(sql,[poId])).rows;
}

// >>> ใหม่: ที่มาจาก PR (ผ่าน RFQ ของ PO)
async function getPOSourcePRItems(poId){
  const sql=`
    SELECT ri.rfq_item_id, ri.pr_id, pr.pr_no, pri.pr_item_id,
           i.item_id, i.item_name,
           pri.qty_requested AS requested_qty, pri.unit AS pr_unit, pri.note,
           ri.qty AS rfq_qty, ri.unit AS rfq_unit, ri.spec
    FROM purchase_orders po
    JOIN request_for_quotations rfq ON rfq.rfq_id = po.rfq_id
    JOIN rfq_items ri ON ri.rfq_id = rfq.rfq_id
    JOIN purchase_request_items pri ON pri.pr_item_id = ri.pr_item_id
    JOIN purchase_requests pr ON pr.pr_id = ri.pr_id
    JOIN items i ON i.item_id = pri.item_id
    WHERE po.po_id = $1
    ORDER BY pr.pr_no, i.item_name;
  `;
  return (await pool.query(sql,[poId])).rows;
}

// ===== GR (list + detail)
async function getAllGRHistory(){
  const sql=`
    SELECT gr.gr_id, gr.gr_no, gr.gr_date, gr.status,
           po.po_no, po.po_id, po.supplier_name,
           SUM(gri.qty_received) AS total_received
    FROM goods_receipts gr
    JOIN purchase_orders po ON po.po_id = gr.po_id
    JOIN goods_receipt_items gri ON gri.gr_id = gr.gr_id
    GROUP BY gr.gr_id, po.po_no, po.po_id, po.supplier_name
    ORDER BY gr.gr_date DESC;
  `;
  return (await pool.query(sql)).rows;
}
async function getGRHistoryByPO(poId){
  const sql=`
    SELECT gr.gr_id, gr.gr_no, gr.gr_date, gr.status,
           SUM(gri.qty_received) AS total_received
    FROM goods_receipts gr
    JOIN goods_receipt_items gri ON gri.gr_id = gr.gr_id
    WHERE gr.po_id = $1
    GROUP BY gr.gr_id
    ORDER BY gr.gr_date ASC;
  `;
  return (await pool.query(sql,[poId])).rows;
}
async function getGRItems(grId){
  const sql=`
    SELECT gri.gr_item_id, i.item_id, i.item_name,
           gri.qty_ordered, gri.qty_received, gri.status,
           gri.lot_id, il.lot_no, il.exp_date
    FROM goods_receipt_items gri
    JOIN items i ON i.item_id = gri.item_id
    LEFT JOIN item_lots il ON il.lot_id = gri.lot_id
    WHERE gri.gr_id = $1
    ORDER BY i.item_name ASC;
  `;
  return (await pool.query(sql,[grId])).rows;
}

module.exports = {
  getRFQHistory, getRFQItems,
  getPOHistory,  getPOItems, getPOSourcePRItems,
  getAllGRHistory, getGRHistoryByPO, getGRItems
};
