// utils/generateCode.js
async function generateAutoCode(pool, { prefix, tableName, codeField, orderBy = 'id' }) {
  const query = `
    SELECT ${codeField}
    FROM ${tableName}
    WHERE ${codeField} IS NOT NULL
    ORDER BY ${orderBy} DESC
    LIMIT 1
  `;
  const result = await pool.query(query);
  const lastCode = result.rows[0]?.[codeField];
  let nextNumber = 1;
  if (lastCode) {
    const num = parseInt(lastCode.replace(prefix, ""));
    nextNumber = num + 1;
  }
  return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
}

module.exports = { generateAutoCode };
