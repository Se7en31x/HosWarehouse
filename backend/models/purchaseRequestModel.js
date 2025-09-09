const { pool } = require("../config/db");
const { generateDocNo } = require("../utils/docCounter");

// ✅ ดึงรายการสินค้า (ใช้ในหน้าเลือกสั่งซื้อ)
async function getItems() {
  const { rows } = await pool.query(
    `SELECT i.item_id, i.item_name, i.item_category, i.item_unit, i.item_min, i.item_max, i.item_img,
            COALESCE(SUM(il.qty_remaining), 0) AS current_stock
     FROM items i
     LEFT JOIN item_lots il ON i.item_id = il.item_id
     WHERE i.is_deleted = false
     GROUP BY i.item_id
     ORDER BY i.item_name ASC`
  );
  return rows;
}

// ✅ ดึงคำขอทั้งหมด (PR Header + User)
async function getAllPurchaseRequests() {
  const { rows } = await pool.query(
    `SELECT pr.pr_id, pr.pr_no, pr.status, pr.created_at,
       u.firstname, u.lastname,
       pri.pr_item_id, pri.qty_requested, pri.unit, pri.note,
       i.item_name, i.item_category
     FROM purchase_requests pr
     JOIN purchase_request_items pri ON pr.pr_id = pri.pr_id
     JOIN items i ON pri.item_id = i.item_id
     LEFT JOIN "Admin".users u ON pr.requester_id = u.user_id
     WHERE pr.status = 'รอดำเนินการ'   -- ✅ filter
     ORDER BY pr.created_at DESC;`
  );
  return rows;
}

// ✅ ดึงทุกรายการ (PR Items flatten)
async function getAllPurchaseRequestItems() {
  const { rows } = await pool.query(
    `SELECT 
       pr.pr_id,
       pr.pr_no,
       pr.status,
       pr.created_at,
       u.firstname,
       u.lastname,
       pri.pr_item_id,
       pri.qty_requested,
       pri.unit,
       pri.note,
       i.item_name,
       i.item_category
     FROM purchase_requests pr
     JOIN purchase_request_items pri ON pr.pr_id = pri.pr_id
     JOIN items i ON pri.item_id = i.item_id
     LEFT JOIN "Admin".users u ON pr.requester_id = u.user_id
     ORDER BY pr.created_at DESC`
  );
  return rows;
}

// ✅ ดึงคำขอทีละตัว (header + items)
async function getPurchaseRequestById(pr_id) {
  const { rows: header } = await pool.query(
    `SELECT pr.*, u.firstname, u.lastname
     FROM purchase_requests pr
     LEFT JOIN "Admin".users u ON pr.requester_id = u.user_id
     WHERE pr.pr_id = $1`,
    [pr_id]
  );

  const { rows: items } = await pool.query(
    `SELECT pri.*, i.item_name, i.item_category
     FROM purchase_request_items pri
     JOIN items i ON pri.item_id = i.item_id
     WHERE pri.pr_id = $1`,
    [pr_id]
  );

  return { header: header[0], items };
}

// ✅ สร้างคำขอสั่งซื้อใหม่
async function createPurchaseRequest({ requester_id, item_id, qty_requested, unit, note }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const prNo = await generateDocNo(client, "purchase_request"); // ✅ ใช้ docCounter

    const prRes = await client.query(
      `INSERT INTO purchase_requests (pr_no, requester_id, status, created_at)
       VALUES ($1, $2, 'รอดำเนินการ', NOW())
       RETURNING pr_id, pr_no`,
      [prNo, requester_id]
    );

    const pr_id = prRes.rows[0].pr_id;

    await client.query(
      `INSERT INTO purchase_request_items (pr_id, item_id, qty_requested, unit, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [pr_id, item_id, qty_requested, unit, note]
    );

    await client.query("COMMIT");
    return prRes.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function getPRReport({ startDate, endDate }) {
  let query = `
    SELECT 
      pr.pr_id,
      pr.pr_no,
      pr.created_at,
      pr.status,
      u.firstname,
      u.lastname,
      pri.pr_item_id,
      pri.qty_requested,
      pri.unit,
      i.item_name,
      i.item_category
    FROM purchase_requests pr
    JOIN purchase_request_items pri ON pr.pr_id = pri.pr_id
    JOIN items i ON pri.item_id = i.item_id
    LEFT JOIN "Admin".users u ON pr.requester_id = u.user_id
  `;

  const params = [];
  if (startDate && endDate) {
    query += ` WHERE pr.created_at::date BETWEEN $1 AND $2 `;
    params.push(startDate, endDate);
  }

  query += `
    ORDER BY pr.created_at DESC
  `;

  const { rows } = await pool.query(query, params);
  return rows;
}


module.exports = {
  getItems,
  getAllPurchaseRequests,
  getAllPurchaseRequestItems,
  getPurchaseRequestById,
  createPurchaseRequest,
  getPRReport
};
