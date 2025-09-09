// services/manager/runManagerRules.js
const { checkLowStock } = require("./lowStock");
const { checkExpiredItems } = require("./expiredItems");
const { checkDamagedItems } = require("./damagedItems");
const { checkNewRequests } = require("./checkNewRequests");
const { checkReturnRequests } = require("./checkReturnRequests");
const { checkStockOutNotifications } = require("./checkStockOutNotifications");
const { checkStockInNotifications } = require("./checkStockInNotifications"); // ✅ เพิ่ม import ใหม่

async function runManagerRules() {
    try {
        await checkLowStock();
        await checkExpiredItems();
        await checkDamagedItems();
        await checkNewRequests();
        await checkReturnRequests();
        await checkStockOutNotifications();
        await checkStockInNotifications(); // ✅ เรียกใช้ rule การนำเข้า
    } catch (err) {
        console.error("❌ Error running manager rules:", err.message);
    }
}

module.exports = { runManagerRules };
