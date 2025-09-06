const { pool } = require("../../config/db");

const StockOutModel = {
  // ✅ ดึงประวัติ Stock Out ทั้งหมด
  async getAllStockoutHeaders() {
    try {
      const result = await pool.query(`
        SELECT 
          so.stockout_id,
          so.stockout_no,
          so.stockout_date,
          so.stockout_type,
          so.note AS header_note,
          u.firstname || ' ' || u.lastname AS user_name,
          so.created_at,
          COUNT(DISTINCT sod.stockout_detail_id) AS total_items,
          COALESCE(SUM(sod.qty),0) AS total_qty   -- ✅ รวมจำนวนด้วย
        FROM stock_outs so
        LEFT JOIN "Admin".users u ON so.user_id = u.user_id
        LEFT JOIN stock_out_details sod ON so.stockout_id = sod.stockout_id
        GROUP BY so.stockout_id, u.firstname, u.lastname
        ORDER BY so.stockout_date DESC, so.stockout_id DESC;
      `);
      return result.rows;
    } catch (error) {
      console.error("❌ Error getAllStockoutHeaders:", error);
      throw error;
    }
  },

  // ✅ ดึง Stock Out ตามช่วงเวลา
  async getHeadersByDateRange(startDate, endDate) {
    try {
      const result = await pool.query(`
        SELECT 
          so.stockout_id,
          so.stockout_no,
          so.stockout_date,
          so.stockout_type,
          so.note AS header_note,
          u.firstname || ' ' || u.lastname AS user_name,
          so.created_at,
          COUNT(DISTINCT sod.stockout_detail_id) AS total_items,
          COALESCE(SUM(sod.qty),0) AS total_qty
        FROM stock_outs so
        LEFT JOIN "Admin".users u ON so.user_id = u.user_id
        LEFT JOIN stock_out_details sod ON so.stockout_id = sod.stockout_id
        WHERE so.stockout_date BETWEEN $1 AND $2
        GROUP BY so.stockout_id, u.firstname, u.lastname
        ORDER BY so.stockout_date DESC, so.stockout_id DESC;
      `, [startDate, endDate]);
      return result.rows;
    } catch (error) {
      console.error("❌ Error getHeadersByDateRange StockOut:", error);
      throw error;
    }
  },

  // ✅ ดึง Stock Out รายการเดียว
  async getById(stockoutId) {
    try {
      const result = await pool.query(`
        SELECT 
          so.stockout_id,
          so.stockout_no,
          so.stockout_date,
          so.stockout_type,
          so.note AS header_note,
          u.firstname || ' ' || u.lastname AS user_name,
          sod.stockout_detail_id,
          sod.item_id,
          i.item_name,
          sod.qty,
          sod.unit,
          sod.note AS detail_note,
          il.lot_no,
          il.exp_date,
          so.created_at
        FROM stock_outs so
        JOIN stock_out_details sod ON so.stockout_id = sod.stockout_id
        JOIN items i ON sod.item_id = i.item_id
        LEFT JOIN item_lots il ON sod.lot_id = il.lot_id
        LEFT JOIN "Admin".users u ON so.user_id = u.user_id
        WHERE so.stockout_id = $1
        ORDER BY sod.stockout_detail_id ASC;
      `, [stockoutId]);
      return result.rows;
    } catch (error) {
      console.error("❌ Error getById StockOut:", error);
      throw error;
    }
  }
};

module.exports = StockOutModel;
