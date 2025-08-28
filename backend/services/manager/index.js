// services/manager/runManagerRules.js
const { checkLowStock } = require("./lowStock");
const { checkExpiredItems } = require("./expiredItems");
const { checkDamagedItems } = require("./damagedItems");
const { checkNewRequests } = require('./checkNewRequests');
const { checkReturnRequests } = require('./checkReturnRequests');
const { checkStockOutNotifications } = require('./checkStockOutNotifications'); // เพิ่มฟังก์ชันใหม่

async function runManagerRules() {
    try {
        await checkLowStock();
        await checkExpiredItems();
        await checkDamagedItems();
        await checkNewRequests();
        await checkReturnRequests();
        await checkStockOutNotifications(); // เพิ่มการตรวจสอบตัดสต็อก
        console.log("✅ All manager rules executed successfully");
    } catch (err) {
        console.error("❌ Error running manager rules:", err.message);
    }
}

module.exports = { runManagerRules };