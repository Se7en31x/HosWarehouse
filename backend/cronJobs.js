// cronJobs.js
const cron = require("node-cron");
const { runManagerRules } = require("./services/manager");
const { runUserNotifications } = require("./services/user");
const { runPurchasingRules } = require("./services/purchasing"); // 👈 เพิ่ม

// 🚀 รันทุก ๆ 10 วินาที (Dev/Test Mode)
cron.schedule("*/10 * * * * *", async () => {
  console.log("🚀 Running Manager Rules (every 10s)...");
  await runManagerRules();

  console.log("👤 Running User Notifications (every 10s)...");
  await runUserNotifications();

  console.log("📦 Running Purchasing Rules (every 10s)...");
  await runPurchasingRules();
});

// // 🟢 Production Mode → ทุกวันเวลา 00:05
// cron.schedule("5 0 * * *", async () => {
//   console.log("🕛 Running Manager Rules (daily 00:05)...");
//   await runManagerRules();

//   console.log("🕛 Running Purchasing Rules (daily 00:05)...");
//   await runPurchasingRules();
// });
