const { pool } = require("../../config/db");

// ✅ รายงานคงคลัง (Summary)
exports.getInventorySummary = async (filters) => {
  const { category, dateRange } = filters;
  let query = `
    SELECT 
      i.item_id AS code,
      i.item_name AS name,
      i.item_category AS category,
      i.item_unit AS unit,
      COALESCE(SUM(sin.qty), 0) AS received,
      COALESCE(SUM(sout.qty), 0) AS issued,
      COALESCE(SUM(sin.qty), 0) - COALESCE(SUM(sout.qty), 0) AS balance
    FROM items i
    LEFT JOIN stock_in_details sin ON sin.item_id = i.item_id
    LEFT JOIN stock_out_details sout ON sout.item_id = i.item_id
    WHERE i.is_deleted = false
  `;
  const params = [];

  // filter: ประเภท
  if (category && category !== "all") {
    params.push(category);
    query += ` AND i.item_category = $${params.length}`;
  }

  // filter: ช่วงเวลา (ตาม stock_in)
  if (dateRange && dateRange.start && dateRange.end) {
    params.push(dateRange.start, dateRange.end);
    query += ` AND sin.created_at BETWEEN $${params.length - 1} AND $${params.length}`;
  }

  query += `
    GROUP BY i.item_id, i.item_name, i.item_category, i.item_unit
    ORDER BY i.item_name;
  `;

  const { rows } = await pool.query(query, params);
  return rows;
};

// ✅ รายงานคงคลัง (By Department)
exports.getInventoryByDepartment = async (filters) => {
  const { category, department, dateRange } = filters;
  let query = `
    SELECT 
      i.item_id AS code,
      i.item_name AS name,
      i.item_category AS category,
      i.item_unit AS unit,
      u.department AS dept,
      COALESCE(SUM(sin.qty), 0) AS received,
      COALESCE(SUM(sout.qty), 0) AS issued,
      COALESCE(SUM(sin.qty), 0) - COALESCE(SUM(sout.qty), 0) AS balance
    FROM items i
    LEFT JOIN stock_in_details sin ON sin.item_id = i.item_id
    LEFT JOIN stock_out_details sout ON sout.item_id = i.item_id
    LEFT JOIN stock_outs so ON sout.stockout_id = so.stockout_id
    LEFT JOIN users u ON so.user_id = u.user_id
    WHERE i.is_deleted = false
  `;
  const params = [];

  // filter: ประเภท
  if (category && category !== "all") {
    params.push(category);
    query += ` AND i.item_category = $${params.length}`;
  }

  // filter: แผนก
  if (department && department !== "all") {
    params.push(department);
    query += ` AND u.department = $${params.length}`;
  }

  // filter: ช่วงเวลา (ตาม stock_outs)
  if (dateRange && dateRange.start && dateRange.end) {
    params.push(dateRange.start, dateRange.end);
    query += ` AND so.created_at BETWEEN $${params.length - 1} AND $${params.length}`;
  }

  query += `
    GROUP BY i.item_id, i.item_name, i.item_category, i.item_unit, u.department
    ORDER BY i.item_name, u.department;
  `;

  const { rows } = await pool.query(query, params);
  return rows;
};
