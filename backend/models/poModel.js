const { pool } = require('../config/db'); // แก้ไข path ให้ตรงกับที่อยู่ไฟล์ db.js ของคุณ

const qn = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

exports.list = async ({ q, status, start, end, page, pageSize }) => {
  const params = [];
  let where = 'WHERE 1=1';

  if (q) {
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    where += ` AND (
      p.po_no ILIKE $1 OR s.supplier_name ILIKE $2
      OR p.ref_pr_no ILIKE $3 OR p.ref_rfq_no ILIKE $4
    )`;
  }
  if (status && status !== 'all') {
    params.push(status);
    where += ` AND p.po_status = $${params.length}`;
  }
  if (start) { params.push(start); where += ` AND p.po_date >= $${params.length}`; }
  if (end)   { params.push(end);   where += ` AND p.po_date <= $${params.length}`; }

  const offset = (page - 1) * pageSize;
  params.push(pageSize, offset);

  const sqlData = `
    SELECT p.po_id, p.po_no, p.po_date, p.po_status AS status, p.total_amount,
           p.ref_pr_no, p.ref_rfq_no,
           s.supplier_name AS vendor_name
    FROM purchase_orders p
    LEFT JOIN suppliers s ON s.supplier_id = p.supplier_id
    ${where}
    ORDER BY p.po_date DESC, p.po_id DESC
    LIMIT $${params.length-1} OFFSET $${params.length};
  `;
  const sqlCount = `
    SELECT COUNT(*) AS cnt
    FROM purchase_orders p
    LEFT JOIN suppliers s ON s.supplier_id = p.supplier_id
    ${where};
  `;

  const client = await pool.connect();
  try {
    const [rowsRes, cntRes] = await Promise.all([
      client.query(sqlData, params),
      client.query(sqlCount, params.slice(0, params.length - 2))
    ]);
    return { data: rowsRes.rows, total: Number(cntRes.rows[0]?.cnt || 0) };
  } finally { client.release(); }
};

exports.getById = async (poId) => {
  const client = await pool.connect();
  try {
    const head = await client.query(
      `SELECT p.*, s.supplier_name, s.supplier_address, s.supplier_contact_name, s.supplier_phone, s.supplier_email
         FROM purchase_orders p
         LEFT JOIN suppliers s ON s.supplier_id = p.supplier_id
        WHERE p.po_id = $1`, [poId]);

    if (head.rowCount === 0) return null;
    const h = head.rows[0];

    const items = await client.query(
      `SELECT d.po_detail_id, d.item_id, d.item_name AS name,
             d.order_qty AS qty, d.order_price AS unit_price, d.item_discount AS discount,
             d.line_total, d.item_unit AS unit, d.item_code AS code
         FROM purchase_order_details d
        WHERE d.po_id = $1
        ORDER BY d.po_detail_id`, [poId]);

    const vendor = {
      name: h.supplier_name || null,
      address: h.supplier_address || null,
      contact: h.supplier_contact_name || null,
      phone: h.supplier_phone || null,
      email: h.supplier_email || null,
    };

    return {
      po_id: h.po_id,
      po_no: h.po_no,
      po_date: h.po_date,
      status: h.po_status,
      vendor,
      reference: { pr_no: h.ref_pr_no || null, rfq_no: h.ref_rfq_no || null },
      terms: {
        payment_terms: h.payment_terms,
        shipping_terms: h.shipping_terms,
        credit_days: null,
        delivery_days: null,
        warranty_months: null,
        note: h.po_note,
        vat_rate: h.vat_rate
      },
      items: items.rows.map(r => ({
        item_id: r.item_id,
        code: r.code,
        name: r.name,
        unit: r.unit,
        qty: Number(r.qty || 0),
        unit_price: Number(r.unit_price || 0),
        discount: Number(r.discount || 0),
        line_total: Number(r.line_total || 0)
      })),
      summary: {
        sub_total: Number(h.sub_total || 0),
        vat: Number(h.vat_amount || 0),
        grand_total: Number(h.total_amount || 0),
      }
    };
  } finally { client.release(); }
};

exports.createIssued = async ({ payload, userId }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) supplier: ใช้ vendor_id หรือสร้างใหม่ถ้ากรอก manual
    let supplierId = payload.vendor_id || null;
    if (!supplierId && payload.vendor_manual?.name) {
      const insSup = await client.query(
        `INSERT INTO suppliers (supplier_name, supplier_address, supplier_contact_name, supplier_phone, supplier_email, supplier_note)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING supplier_id`,
        [
          payload.vendor_manual.name || null,
          payload.vendor_manual.address || null,
          payload.vendor_manual.contact || null,
          payload.vendor_manual.phone || null,
          payload.vendor_manual.email || null,
          payload.vendor_manual.note || null
        ]
      );
      supplierId = insSup.rows[0].supplier_id;
    }
    if (!supplierId) throw Object.assign(new Error('Supplier is required'), { statusCode: 400 });

    // 2) ยอดรวม
    const subTotal = Number(payload.summary?.sub_total ?? 0);
    const vatRate  = Number(payload.terms?.vat_rate ?? 0);
    const vatAmt   = Number(payload.summary?.vat ?? 0);
    const grand    = Number(payload.summary?.grand_total ?? subTotal + vatAmt);

    // 3) INSERT หัวเอกสาร (เก็บ ref_pr_no/ref_rfq_no เป็นข้อความ)
    const insHead = await client.query(
      `INSERT INTO purchase_orders
       (po_date, supplier_id, user_id, po_status, po_note,
        po_no, created_at, payment_terms, shipping_terms,
        total_amount, sub_total, vat_rate, vat_amount,
        ref_pr_no, ref_rfq_no)
       VALUES (CURRENT_DATE, $1, $2, 'issued', $3,
               $4, NOW(), $5, $6,
               $7, $8, $9, $10,
               $11, $12)
       RETURNING po_id`,
      [
        supplierId, userId,
        payload.terms?.note || null,
        payload.po_no || null,
        payload.terms?.payment_terms || null,
        payload.terms?.shipping_terms || null,
        grand, subTotal, vatRate, vatAmt,
        payload.reference?.pr_no || null,
        payload.reference?.rfq_no || null
      ]
    );
    const poId = insHead.rows[0].po_id;

    // 4) INSERT รายการ (ง่ายๆ ไม่อ้าง pr_detail/rfq_detail)
    for (const it of payload.items) {
      const qty = qn(it.qty);
      const price = qn(it.unit_price);
      const discount = qn(it.discount);
      const lineTotal = qty * price - discount;

      await client.query(
        `INSERT INTO purchase_order_details
           (po_id, item_id, order_qty, order_price, item_discount, line_total, item_name, item_unit, item_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          poId,
          it.item_id || null,
          qty,
          price,
          discount,
          lineTotal,
          it.name || null,
          it.unit || null,
          it.code || null
        ]
      );
    }

    await client.query('COMMIT');
    return poId;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally { client.release(); }
};

exports.cancel = async ({ poId, userId, reason }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const head = await client.query(`SELECT po_status FROM purchase_orders WHERE po_id = $1 FOR UPDATE`, [poId]);
    if (head.rowCount === 0) throw new Error('PO not found');
    if (head.rows[0].po_status === 'canceled') {
      const err = new Error('PO already canceled'); err.code = 'PO_ALREADY_CANCELED'; throw err;
    }
    await client.query(
      `UPDATE purchase_orders
          SET po_status='canceled', canceled_at=NOW(), cancel_reason=$2, updated_at=NOW()
        WHERE po_id=$1`,
      [poId, reason || null]
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK'); throw e;
  } finally { client.release(); }
};

exports.listFiles = async (poId) => {
  const { rows } = await pool.query(
    `SELECT file_id, file_name, file_url, uploaded_by, uploaded_at
       FROM po_files WHERE po_id = $1 ORDER BY uploaded_at DESC`, [poId]);
  return rows;
};

exports.addFile = async ({ poId, file_name, file_path, file_url, uploaded_by }) => {
  const { rows } = await pool.query(
    `INSERT INTO po_files (po_id, file_name, file_path, file_url, uploaded_by)
     VALUES ($1,$2,$3,$4,$5) RETURNING file_id`,
    [poId, file_name, file_path, file_url, uploaded_by]
  );
  return rows[0].file_id;
};

exports.deleteFile = async ({ poId, fileId }) => {
  await pool.query(`DELETE FROM po_files WHERE file_id=$1 AND po_id=$2`, [fileId, poId]);
};