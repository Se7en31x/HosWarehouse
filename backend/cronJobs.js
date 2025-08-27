// cronJobs.js
const cron = require("node-cron");
const { runManagerRules } = require("./services/manager");

// 🚀 เรียกตอน server start ทันที (ไม่ต้องรอ cron)
// (async () => {
//   console.log("⚡ Run Manager Rules on server start...");
//   await runManagerRules();
// })();

// cron.schedule("*/10 * * * * *", async () => {
//   console.log("🚀 Running Manager Rules (every 5 seconds)...");
//   await runManagerRules();
// });


// // 🟢 โหมด Production → ทุกวัน 00:05
// cron.schedule("5 0 * * *", async () => {
//   console.log("🕛 Running Manager Rules (daily 00:05)...");
//   await runManagerRules();
// });

// 🟡 โหมด Dev/Test → ทุก 10 วินาที (ปรับได้)
// if (process.env.NODE_ENV !== "production") {
//   setInterval(async () => {
//     console.log("⚡ Dev Mode: Running Manager Rules (every 10s)...");
//     await runManagerRules();
//   }, 10000);
// }
