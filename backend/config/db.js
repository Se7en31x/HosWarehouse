const { Pool } = require("pg");
require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false, // ✅ dev ปิด SSL, prod เปิด SSL
  client_encoding: "UTF8",
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// ✅ เพิ่มโค้ดนี้เพื่อจัดการ error event ที่อาจเกิดขึ้นกับ pool
pool.on("error", (err, client) => {
  console.error("❌ Unexpected error on idle client:", err);
  // การปล่อยให้แอปพลิเคชันทำงานต่อไปได้
  // ในกรณีนี้ Pool จะจัดการการเชื่อมต่อที่เสียให้เอง
});

const connectDB = async () => {
  try {
    const client = await pool.connect();
    await client.query("SET TIMEZONE TO 'Asia/Bangkok'");
    console.log(
      `Connected to PostgreSQL (Asia/Bangkok) in ${isProduction ? "production" : "development"} mode`
    );
    client.release();
  } catch (err) {
    console.error("Error Connecting to PostgreSQL : ", err.stack);
  }
};

const disconnectDB = async () => {
  try {
    await pool.end();
    console.log("Disconnected from PostgreSQL");
  } catch (err) {
    console.error("Error disconnecting from PostgreSQL:", err.stack);
  }
};

module.exports = { pool, connectDB, disconnectDB };