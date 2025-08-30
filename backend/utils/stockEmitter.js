// // backend/utils/stockEmitter.js
// const { getIO } = require("../socket");

// /**
//  * ส่ง event แจ้งเตือนว่ามีการเปลี่ยนยอดคลัง
//  * @param {Object} payload - ข้อมูลการเปลี่ยนแปลง
//  * @param {string} payload.type - ประเภท เช่น in, out, return, damaged, expired, adjusted
//  * @param {number} payload.item_id - รหัสสินค้า
//  * @param {number} payload.qty - จำนวนที่เปลี่ยน
//  * @param {number} [payload.user_id] - ผู้ใช้ที่ทำรายการ
//  * @param {string} [payload.note] - หมายเหตุ
//  */
// function emitStockUpdate({ type, item_id, qty, user_id, note }) {
//   try {
//     const io = getIO();
//     io.to("stock_updates").emit("stockUpdated", {
//       type,
//       item_id,
//       qty,
//       user_id,
//       note,
//       time: new Date(),
//     });
//     console.log(`📢 Emit stock update:`, { type, item_id, qty });
//   } catch (err) {
//     console.error("❌ emitStockUpdate error:", err.message);
//   }
// }

// module.exports = { emitStockUpdate };
