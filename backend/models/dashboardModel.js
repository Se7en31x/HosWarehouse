const { pool } = require("../config/db");

// ✅ Summary รวมยอดต่าง ๆ
const getSummary = async () => {
  const result = await pool.query(`
    SELECT 
      -- พัสดุทั้งหมด
      (SELECT COUNT(*) FROM items WHERE is_deleted = false) AS total_items,

      -- คำขอเบิก (นับจาก requests)
      (SELECT COUNT(*) 
       FROM requests r
       WHERE r.request_type IN ('เบิก','withdraw') 
         AND r.is_deleted = false
      ) AS total_requests,

      -- คำขอยืม (นับจาก requests)
      (SELECT COUNT(*) 
       FROM requests r
       WHERE r.request_type IN ('ยืม','borrow') 
         AND r.is_deleted = false
      ) AS total_borrow,

      -- ใกล้หมดหรือหมดอายุ
      (SELECT COUNT(*) 
       FROM item_lots 
       WHERE qty_remaining <= 5 OR exp_date < NOW()
      ) AS expiring;
  `);
  return result.rows[0];
};

// ✅ Monthly เบิก/ยืม แยกตามเดือน (ตั้งแต่ต้นปี → เดือนล่าสุด)
const getMonthly = async () => {
  const result = await pool.query(`
    WITH months AS (
      SELECT generate_series(
        DATE_TRUNC('year', CURRENT_DATE),        -- เริ่มจาก ม.ค. ปีนี้
        DATE_TRUNC('month', CURRENT_DATE),       -- ถึงเดือนปัจจุบัน
        interval '1 month'
      )::date AS month_start
    )
    SELECT 
      TO_CHAR(m.month_start, 'Mon') AS month,
      COALESCE(SUM(CASE WHEN r.request_type IN ('เบิก','withdraw') THEN 1 ELSE 0 END),0) AS withdraw,
      COALESCE(SUM(CASE WHEN r.request_type IN ('ยืม','borrow') THEN 1 ELSE 0 END),0) AS borrow
    FROM months m
    LEFT JOIN requests r 
      ON DATE_TRUNC('month', r.request_date) = m.month_start
      AND r.is_deleted = false
    GROUP BY m.month_start
    ORDER BY m.month_start;
  `);
  return result.rows;
};

// ✅ Category ratio (จำนวน item ตามหมวดหมู่)
const getCategory = async () => {
  const result = await pool.query(`
    SELECT COALESCE(item_category, 'ไม่ระบุ') AS name, COUNT(*) AS value
    FROM items
    WHERE is_deleted = false
    GROUP BY item_category
    ORDER BY value DESC;
  `);
  return result.rows;
};

// ✅ Movements ล่าสุด (ทั้งนำเข้า-นำออก)
const getMovements = async () => {
  const result = await pool.query(`
    SELECT 
      sm.move_id,
      i.item_name,
      sm.move_date,
      sm.move_qty,
      sm.move_type,
      sm.move_status
    FROM stock_movements sm
    JOIN items i ON sm.item_id = i.item_id
    ORDER BY sm.move_date DESC
    LIMIT 10;
  `);
  return result.rows;
};

module.exports = { getSummary, getMonthly, getCategory, getMovements };
