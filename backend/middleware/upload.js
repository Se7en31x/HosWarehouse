const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // จำกัดประเภทไฟล์ให้เป็น PDF, JPEG, PNG เท่านั้น (สอดคล้องกับ frontend)
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("ไฟล์ต้องเป็น PDF, JPEG, หรือ PNG เท่านั้น"));
    }
    // แก้ไขการเข้ารหัสชื่อไฟล์ให้เป็น UTF-8
    file.originalname = Buffer.from(file.originalname, "latin1").toString("utf8");
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // จำกัดขนาดไฟล์ที่ 10MB
    files: 10, // จำกัดจำนวนไฟล์ต่อการอัปโหลด
  },
});

module.exports = upload;