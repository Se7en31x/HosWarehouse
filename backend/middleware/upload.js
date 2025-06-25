// backend/middleware/upload.js
const multer = require('multer');
const path = require('path');

// ตั้งค่าที่เก็บไฟล์
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // โฟลเดอร์เก็บไฟล์
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname); // ดึงนามสกุลไฟล์
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`); // ชื่อไฟล์ใหม่
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const isValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  if (isValid) cb(null, true);
  else cb(new Error('Only images are allowed'), false);
};

module.exports = multer({ storage, fileFilter });