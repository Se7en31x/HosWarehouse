const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const poController = require('../controllers/poController');

// ── Upload config (ไฟล์แนบ PO) ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(process.cwd(), 'uploads', 'po')),
  filename: (req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^\w.\-ก-ฮะ-๙]/g, '_');
    cb(null, `${ts}__${safe}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (_req, file, cb) => {
    const ok = ['.pdf', '.jpg', '.jpeg', '.png'].includes(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Invalid file type'), ok);
  },
});

// ── PO List/Detail ──
router.get('/po', poController.list);
router.get('/po/:id', poController.getById);

// ── Create PO (บันทึกแล้ว = issued) ──
router.post('/po', poController.createIssued);

// ── Cancel PO ──
router.put('/po/:id/cancel', poController.cancel);

// ── Attachments ──
router.get('/po/:id/files', poController.listFiles);
router.post('/po/:id/files', upload.single('file'), poController.uploadFile);
router.delete('/po/:id/files/:file_id', poController.deleteFile);

module.exports = router;
