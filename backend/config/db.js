const { Pool } = require('pg');
require('dotenv').config();

// สร้างการเชื่อมต่อ PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// ทดสอบการเชื่อมต่อฐานข้อมูล (ไม่จำเป็นต้อง connect() ถาวร เพราะ Pool จะจัดการให้เอง)
const connectDB = async () => {
    try {
        const client = await pool.connect();
        console.log('Connected to PostgreSQL');
        client.release(); // ปล่อย connection กลับเข้า pool
    } catch (err) {
        console.error('Error Connecting to PostgreSQL : ', err.stack);
        process.exit(1);
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
