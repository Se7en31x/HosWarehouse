// backend/dbListener.js
const { Client } = require('pg');
const { getIO } = require('./socket');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

async function setupDbListener() {
    const client = new Client({ connectionString });

    client.on('error', err => {
        console.error('❌ Database Client Error:', err.stack);
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

                if (payload.table === 'item_lots' && (payload.action === 'UPDATE' || payload.action === 'INSERT')) {
                    const item_id = payload.data.item_id;
                    const lot_id = payload.data.lot_id;
                    const new_lot_qty = payload.data.new_lot_qty;
                    const new_total_qty = payload.data.new_total_qty;

                    getIO().emit('itemLotUpdated', {
                        item_id: item_id,
                        lot_id: lot_id,
                        new_lot_qty: new_lot_qty,
                        new_total_qty: new_total_qty
                    });
                    console.log(`📦 ส่ง Event 'itemLotUpdated' สำหรับ item_id: ${item_id} จำนวนรวม: ${new_total_qty} จำนวน Lot: ${new_lot_qty}`);
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