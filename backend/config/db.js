const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // <--- ใช้แค่ตัวนี้ก็พอแล้ว
    ssl: { rejectUnauthorized: false } // Railway ใช้ SSL แบบนี้ได้เลย
});


const connectDB = async () => {
    try {
        const client = await pool.connect();
        console.log('Connected to PostgreSQL');
        client.release();
    } catch (err) {
        console.error('Error Connecting to PostgreSQL : ', err.stack);
        // ไม่ปิดแอปโดยตรง
        // process.exit(1);
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
