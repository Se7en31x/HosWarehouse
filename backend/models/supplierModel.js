const { pool } = require("../config/db");

// ✅ ดึงทั้งหมด
async function getAllSuppliers() {
  const { rows } = await pool.query(`
    SELECT * 
    FROM suppliers 
    ORDER BY supplier_name ASC
  `);
  return rows;
}

// ✅ ดึงทีละตัว
async function getSupplierById(id) {
  const { rows } = await pool.query(
    `SELECT * FROM suppliers WHERE supplier_id = $1`,
    [id]
  );
  return rows[0];
}

// ✅ เพิ่มผู้ขาย
async function createSupplier(data) {
  const {
    supplier_name,
    supplier_contact_name,
    supplier_phone,
    supplier_email,
    supplier_address,
    supplier_tax_id,
    supplier_note,
  } = data;

  const { rows } = await pool.query(
    `INSERT INTO suppliers 
      (supplier_name, supplier_contact_name, supplier_phone, supplier_email, 
       supplier_address, supplier_tax_id, supplier_note, is_active, created_at) 
     VALUES ($1,$2,$3,$4,$5,$6,$7,true,NOW()) 
     RETURNING *`,
    [
      supplier_name,
      supplier_contact_name,
      supplier_phone,
      supplier_email,
      supplier_address,
      supplier_tax_id,
      supplier_note,
    ]
  );

  return rows[0];
}

// ✅ แก้ไขผู้ขาย
async function updateSupplier(id, data) {
  const {
    supplier_name,
    supplier_contact_name,
    supplier_phone,
    supplier_email,
    supplier_address,
    supplier_tax_id,
    supplier_note,
  } = data;

  const { rows } = await pool.query(
    `UPDATE suppliers 
     SET supplier_name=$1,
         supplier_contact_name=$2,
         supplier_phone=$3,
         supplier_email=$4,
         supplier_address=$5,
         supplier_tax_id=$6,
         supplier_note=$7,
         updated_at=NOW()
     WHERE supplier_id=$8
     RETURNING *`,
    [
      supplier_name,
      supplier_contact_name,
      supplier_phone,
      supplier_email,
      supplier_address,
      supplier_tax_id,
      supplier_note,
      id,
    ]
  );

  return rows[0];
}

// ✅ Toggle Active/Inactive
async function toggleSupplierStatus(id, isActive, userId) {
  const { rows } = await pool.query(
    `UPDATE suppliers 
     SET is_active=$2, updated_at=NOW(), updated_by=$3
     WHERE supplier_id=$1
     RETURNING *`,
    [id, isActive, userId || null]
  );
  return rows[0];
}

// ✅ ลบผู้ขาย (ไม่ค่อยแนะนำถ้ามีประวัติการซื้อขาย)
async function deleteSupplier(id) {
  await pool.query(`DELETE FROM suppliers WHERE supplier_id = $1`, [id]);
  return { message: "Supplier deleted" };
}

async function getSupplierReport({ startDate, endDate }) {

  let whereClause = "";
  const params = [];

  if (startDate && endDate) {
    params.push(startDate, endDate);
    whereClause = `WHERE po.po_date BETWEEN $${params.length - 1} AND $${params.length}`;
  } else if (startDate) {
    params.push(startDate);
    whereClause = `WHERE po.po_date >= $${params.length}`;
  } else if (endDate) {
    params.push(endDate);
    whereClause = `WHERE po.po_date <= $${params.length}`;
  }

  const sql = `
    SELECT
      s.supplier_id,
      s.supplier_name,
      s.supplier_contact_name,
      s.supplier_phone,
      s.supplier_email,
      s.is_active,
      COUNT(po.po_id) AS total_po,
      COALESCE(SUM(po.grand_total), 0) AS total_spent
    FROM suppliers s
    LEFT JOIN purchase_orders po
      ON s.supplier_id = po.supplier_id
      ${whereClause}
    GROUP BY s.supplier_id, s.supplier_name, s.supplier_contact_name,
             s.supplier_phone, s.supplier_email, s.is_active
    ORDER BY total_spent DESC
  `;

  const { rows } = await pool.query(sql, params);

  return rows;
}




module.exports = {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  toggleSupplierStatus,
  getSupplierReport, // ✅ เพิ่มตรงนี้
};