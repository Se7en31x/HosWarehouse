const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // ใช้ตัวนี้อย่างเดียวพอ
  ssl: { rejectUnauthorized: false } // Railway ใช้ SSL แบบนี้
});

const connectDB = async () => {
  try {
    const client = await pool.connect();
    // ✅ ตั้ง timezone เป็น Asia/Bangkok ทุก session
    await client.query("SET TIMEZONE TO 'Asia/Bangkok'");
    console.log('Connected to PostgreSQL (Asia/Bangkok)');
    client.release();
  } catch (err) {
    console.error('Error Connecting to PostgreSQL : ', err.stack);
  }
};

const disconnectDB = async () => {
  try {
    await pool.end();
    console.log('Disconnected from PostgreSQL');
  } catch (err) {
    console.error('Error disconnecting from PostgreSQL:', err.stack);
  }
};

module.exports = { pool, connectDB, disconnectDB };
