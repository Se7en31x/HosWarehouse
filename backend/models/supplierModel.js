// backend/models/supplierModel.js
const { pool } = require('../config/db');

exports.getAllSuppliers = async () => {
    const query = `
        SELECT supplier_id, supplier_name
        FROM suppliers
        ORDER BY supplier_name ASC;
    `;
    const { rows } = await pool.query(query);
    return rows;
};