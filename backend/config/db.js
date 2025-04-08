const { Client } = require('pg'); 
require('dotenv').config();

// สร้างการเชื่อมต่อ PostgreSQL
const client = new Client({
    user: process.env.DB_USER,      // ใช้ค่า DB_USER จาก .env
    host: process.env.DB_HOST,      // ใช้ค่า DB_HOST จาก .env
    database: process.env.DB_NAME,  // ใช้ค่า DB_NAME จาก .env
    password: process.env.DB_PASSWORD,  // ใช้ค่า DB_PASSWORD จาก .env
    port: process.env.DB_PORT,      // ใช้ค่า DB_PORT จาก .env
});

// เชื่อมต่อฐานข้อมูล
const connectDB = async () => {
    try {
        await client.connect();
        console.log('Connected to PostgreSQL');
    } catch (err) {
        console.error('Error Connecting to PostgreSQL : ', err.stack);
        process.exit(1); // หยุดการทำงานหากไม่สามารถเชื่อมต่อฐานข้อมูลได้
    }
};

// ตัดการเชื่อมต่อฐานข้อมูล
const disconnectDB = async () => {
    try {
        await client.end();
        console.log('Disconnected from PostgreSQL');
    } catch (err) {
        console.error('Error disconnecting from PostgreSQL:', err.stack);
    }
};

module.exports = { client, connectDB, disconnectDB };
