// /config/db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  client_encoding: 'UTF8',
  max: 10,                 // จำกัด connection pool (default 10)
  idleTimeoutMillis: 30000, // ปิด connection ที่ idle เกิน 30s
  connectionTimeoutMillis: 2000,
});

// ✅ เชื่อมครั้งเดียวตอน start server
const connectDB = async () => {
  try {
    const client = await pool.connect();
    await client.query("SET TIMEZONE TO 'Asia/Bangkok'");
    console.log('Connected to PostgreSQL (Asia/Bangkok)');
    client.release();
  } catch (err) {
    console.error('Error Connecting to PostgreSQL : ', err.stack);
  }
};

// ❌ ไม่จำเป็นต้องเรียก disconnectDB ในทุก request
// ใช้เฉพาะตอนปิด server เท่านั้น เช่น process.exit()
const disconnectDB = async () => {
  try {
    await pool.end();
    console.log('Disconnected from PostgreSQL');
  } catch (err) {
    console.error('Error disconnecting from PostgreSQL:', err.stack);
  }
};

module.exports = { pool, connectDB, disconnectDB };
