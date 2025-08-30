// backend/dbListener.js
const { Client } = require('pg');
const { getIO } = require('./socket');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

async function setupDbListener() {
    const client = new Client({ connectionString });

    client.on('error', err => {
        console.error('❌ Database Client Error:', err.stack);
        // พยายามเชื่อมต่อใหม่หลังจาก 5 วินาที
        setTimeout(setupDbListener, 5000); 
    });

    try {
        await client.connect();
        console.log('✅ Connected to PostgreSQL for real-time listener.');

        await client.query('LISTEN inventory_updates');
        console.log('✅ Listening for inventory updates from DB...');

        client.on('notification', (msg) => {
            try {
                const payload = JSON.parse(msg.payload);
                console.log("📦 ได้รับการอัปเดตจากฐานข้อมูล:", payload);
                const io = getIO();

                // 📦 จัดการการอัปเดตจากตาราง items (เพิ่ม, แก้ไข, ลบ)
                if (payload.table === 'items') {
                    if (payload.action === 'INSERT') {
                        io.emit('itemAdded', payload.data);
                        console.log(`📦 ส่ง Event 'itemAdded' สำหรับสินค้าใหม่ ID: ${payload.item_id}`);
                    } else if (payload.action === 'UPDATE') {
                        io.emit('itemUpdated', payload.data);
                        console.log(`📦 ส่ง Event 'itemUpdated' สำหรับสินค้า ID: ${payload.item_id}`);
                    } else if (payload.action === 'DELETE') {
                        io.emit('itemDeleted', payload.item_id);
                        console.log(`📦 ส่ง Event 'itemDeleted' สำหรับสินค้า ID: ${payload.item_id}`);
                    }
                }
                // 📦 จัดการการอัปเดตจากตารางรายละเอียดทั้ง 5
                else if (['medicine_detail', 'medsup_detail', 'equipment_detail', 'meddevices_detail', 'generalsup_detail'].includes(payload.table)) {
                    // ทุกการเปลี่ยนแปลงในตารางเหล่านี้คือการอัปเดตข้อมูลของไอเท็มหลัก
                    io.emit('itemUpdated', payload.data);
                    console.log(`📦 ส่ง Event 'itemUpdated' สำหรับการแก้ไขรายละเอียดสินค้า ID: ${payload.item_id}`);
                }
                // 📦 จัดการการอัปเดตจากตาราง item_lots (อัปเดตจำนวนคงเหลือ)
                else if (payload.table === 'item_lots' && (payload.action === 'UPDATE' || payload.action === 'INSERT')) {
                    const item_id = payload.data.item_id;
                    const lot_id = payload.data.lot_id;
                    const new_lot_qty = payload.data.new_lot_qty;
                    const new_total_qty = payload.data.new_total_qty;

                    io.emit('itemLotUpdated', {
                        item_id: item_id,
                        lot_id: lot_id,
                        new_lot_qty: new_lot_qty,
                        new_total_qty: new_total_qty
                    });
                    console.log(`📦 ส่ง Event 'itemLotUpdated' สำหรับ item_id: ${item_id} จำนวนรวม: ${new_total_qty}`);
                }
            } catch (err) {
                console.error("❌ Error parsing payload:", err);
            }
        });
    } catch (err) {
        console.error('❌ Error setting up DB listener:', err.message);
        setTimeout(setupDbListener, 5000);
    }
}

module.exports = { setupDbListener };