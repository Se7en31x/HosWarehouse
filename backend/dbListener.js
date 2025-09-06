// /backend/dbListener.js
const { pool } = require('./config/db');
const { getIO } = require('./socket');
require('dotenv').config();

let listenerClient; // ✅ เก็บ client ตัวเดียว

async function setupDbListener() {
  if (listenerClient) {
    console.log("⚠️ Listener already running, skip creating new one.");
    return;
  }

  try {
    listenerClient = await pool.connect();
    console.log('✅ Connected to PostgreSQL for real-time listener.');

    await listenerClient.query('LISTEN inventory_updates');
    console.log('✅ Listening for inventory updates from DB...');

    listenerClient.on('notification', (msg) => {
      try {
        const payload = JSON.parse(msg.payload);
        const io = getIO();

        if (payload.table === 'items') {
          if (payload.action === 'INSERT') {
            io.emit('itemAdded', payload.data);
          } else if (payload.action === 'UPDATE') {
            io.emit('itemUpdated', payload.data);
          } else if (payload.action === 'DELETE') {
            io.emit('itemDeleted', payload.item_id);
          }
        } else if (
          ['medicine_detail', 'medsup_detail', 'equipment_detail', 'meddevices_detail', 'generalsup_detail'].includes(payload.table)
        ) {
          io.emit('itemUpdated', payload.data);
        } else if (payload.table === 'item_lots' && ['UPDATE', 'INSERT'].includes(payload.action)) {
          io.emit('itemLotUpdated', {
            item_id: payload.data.item_id,
            lot_id: payload.data.lot_id,
            new_lot_qty: payload.data.new_lot_qty,
            new_total_qty: payload.data.new_total_qty
          });
        }
      } catch (err) {
        console.error("❌ Error parsing payload:", err);
      }
    });

    listenerClient.on('error', (err) => {
      console.error('❌ Database Client Error (Listener):', err.stack);
      listenerClient.release();
      listenerClient = null; // ✅ เคลียร์ทิ้ง
      setTimeout(setupDbListener, 5000); // ✅ ค่อย reconnect ใหม่
    });

  } catch (err) {
    console.error('❌ Error setting up DB listener:', err.message);
    listenerClient = null; // ✅ เคลียร์ทิ้งถ้า connect ไม่ได้
    setTimeout(setupDbListener, 5000);
  }
}

module.exports = { setupDbListener };
