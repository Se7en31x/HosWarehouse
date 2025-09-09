const { pool } = require("../../config/db");

// ✅ รายงานคงคลัง (Summary พร้อมราคา + code)
exports.getInventorySummary = async (filters) => {
  const { category, source } = filters;
  const start = filters.dateRange?.start;
  const end = filters.dateRange?.end;
  let params = [];
  let paramIndex = 1;
  let mainQueryConditions = [];

  // 1. จัดการฟิลเตอร์ประเภท (Category)
  if (category && category !== "all") {
    params.push(category);
    mainQueryConditions.push(`i.item_category = $${paramIndex++}`);
  }

  // สร้างเงื่อนไขสำหรับ Subquery "รับเข้า"
  let receivedQueryConditions = [`sin.item_id = i.item_id`];

  // สร้างเงื่อนไขสำหรับ Subquery "เบิกออก"
  let issuedQueryConditions = [`sout.item_id = i.item_id`];

  // 2. จัดการฟิลเตอร์ช่วงเวลา (Date Range)
  if (start && end) {
    params.push(start);
    const dateStartParam = paramIndex++;
    params.push(end);
    const dateEndParam = paramIndex++;
    receivedQueryConditions.push(`si.stockin_date BETWEEN $${dateStartParam} AND $${dateEndParam}`);
    issuedQueryConditions.push(`so.stockout_date BETWEEN $${dateStartParam} AND $${dateEndParam}`);
  }


  // 3. จัดการฟิลเตอร์แหล่งที่มา (Source) - ใช้เฉพาะกับ 'stock_ins'
  if (source && source !== "all") {
    params.push(source);
    const sourceParam = paramIndex++;
    receivedQueryConditions.push(`si.source_type = $${sourceParam}`);
  }

  const query = `
    SELECT 
      i.item_id,
      i.item_name AS name,
      i.item_category AS category,
      i.item_unit AS unit,
      
      COALESCE(med.med_code, ms.medsup_code, g.gen_code, md.meddevice_code, eq.equip_code) AS code,
      
      -- ราคาต่อหน่วย
      COALESCE(AVG(l.unit_cost), 
        med.med_medium_price, 
        ms.medsup_price, 
        g.gen_price, 
        md.meddevice_price
      ) AS unit_cost,

      -- รับเข้า
      COALESCE((
        SELECT SUM(sin.qty)
        FROM stock_in_details sin
        JOIN stock_ins si ON si.stockin_id = sin.stockin_id
        WHERE ${receivedQueryConditions.join(' AND ')}
      ), 0) AS received,

      -- เบิกออก
      COALESCE((
        SELECT SUM(sout.qty)
        FROM stock_out_details sout
        JOIN stock_outs so ON so.stockout_id = sout.stockout_id
        WHERE ${issuedQueryConditions.join(' AND ')}
      ), 0) AS issued,

      -- คงเหลือ
      COALESCE(SUM(l.qty_remaining), 0) AS balance,

      -- มูลค่ารวม
      COALESCE(SUM(l.qty_remaining * COALESCE(l.unit_cost, med.med_medium_price, ms.medsup_price, g.gen_price, md.meddevice_price)), 0) AS total_value
    
    FROM items i
    LEFT JOIN item_lots l ON l.item_id = i.item_id
    LEFT JOIN medicine_detail med ON med.item_id = i.item_id
    LEFT JOIN medsup_detail ms ON ms.item_id = i.item_id
    LEFT JOIN generalsup_detail g ON g.item_id = i.item_id
    LEFT JOIN meddevices_detail md ON md.item_id = i.item_id
    LEFT JOIN equipment_detail eq ON eq.item_id = i.item_id

    WHERE i.is_deleted = false
    ${mainQueryConditions.length > 0 ? `AND ${mainQueryConditions.join(' AND ')}` : ''}

    GROUP BY 
      i.item_id, i.item_name, i.item_category, i.item_unit,
      med.med_code, med.med_medium_price,
      ms.medsup_code, ms.medsup_price,
      g.gen_code, g.gen_price,
      md.meddevice_code, md.meddevice_price,
      eq.equip_code
    ORDER BY i.item_name;
  `;

  try {
    const { rows } = await pool.query(query, params);
    return rows;
  } catch (err) {
    console.error("Error getInventorySummary:", err);
    throw err;
  }
};