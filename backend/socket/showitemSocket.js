// const inventoryModel = require("../models/inventoryModel");

// module.exports = (io) => {
//   io.on("connection", (socket) => {
//     console.log(`🟢 Client connected: ${socket.id}`);

//     socket.on("requestInventoryData", async () => {
//       try {
//         const items = await inventoryModel.getAllItemsDetailed();
//         socket.emit("itemsData", items);
//         console.log(`🟢 ส่งข้อมูล inventory กลับ: ${items.length} รายการ`);
//       } catch (error) {
//         console.error("❌ Error sending inventory data:", error);
//         socket.emit("itemsData", []); // fallback ส่ง array ว่าง
//       }
//     });

//     socket.on("disconnect", () => {
//       console.log(`🔴 Client disconnected: ${socket.id}`);
//     });
//   });
// };
