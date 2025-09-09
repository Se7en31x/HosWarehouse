// const multer = require("multer");
// const path = require("path");
// const fs = require("fs");

// const uploadDir = "uploads/po";

// // สร้างโฟลเดอร์อัปโหลดถ้ายังไม่มี
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, uploadDir);
//   },
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
//     const ext = path.extname(file.originalname);
//     cb(null, `po-${uniqueSuffix}${ext}`);
//   },
// });

// module.exports = multer({ storage });