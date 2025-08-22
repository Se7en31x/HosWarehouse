const poModel = require('../models/poModel');

const getUserId = (req) => req.user?.user_id || 1;

// ──────────────── List POs ────────────────
exports.list = async (req, res) => {
  try {
    const { q, status, start, end, page = 1, page_size = 12 } = req.query;
    const result = await poModel.list({
      q,
      status,
      start,
      end,
      page: +page,
      pageSize: +page_size,
    });
    res.json(result);
  } catch (e) {
    console.error('po.list error:', e);
    res.status(500).json({ message: 'Failed to fetch purchase orders' });
  }
};

// ──────────────── Get PO by ID ────────────────
exports.getById = async (req, res) => {
  try {
    const row = await poModel.getById(+req.params.id);
    if (!row) return res.status(404).json({ message: 'PO not found' });
    res.json(row);
  } catch (e) {
    console.error('po.getById error:', e);
    res.status(500).json({ message: 'Failed to fetch PO' });
  }
};

// ──────────────── Get PR by PR No ────────────────
exports.getByPrNo = async (req, res) => {
  try {
    const prNo = req.params.pr_no;
    if (!prNo) return res.status(400).json({ message: 'PR No. is required' });

    // ✅ ใช้ฟังก์ชันจาก poModel แทน prModel
    const pr = await poModel.getPurchaseRequestByNo(prNo);
    if (!pr) return res.status(404).json({ message: 'PR not found' });

    res.json(pr);
  } catch (e) {
    console.error('po.getByPrNo error:', e);
    res.status(500).json({ message: 'Failed to fetch PR' });
  }
};

// ──────────────── Create PO ────────────────
exports.createIssued = async (req, res) => {
  try {
    const userId = getUserId(req);
    const payload = req.body; 
    // { vendor_id|vendor_manual, reference:{pr_no, rfq_no}, terms{}, items[], summary{} }

    if (!payload?.items?.length) {
      return res.status(400).json({ message: 'No items' });
    }

    // ✅ บังคับสถานะเป็น issued เสมอ
    payload.status = 'issued';

    const result = await poModel.createIssued({ payload, userId });
    res.status(201).json(result);
  } catch (e) {
    console.error('po.createIssued error:', e);
    const sc = e.statusCode || 500;
    res.status(sc).json({ message: e.message || 'Failed to create PO' });
  }
};

// ──────────────── Cancel PO ────────────────
exports.cancel = async (req, res) => {
  try {
    await poModel.cancel({
      poId: +req.params.id,
      userId: getUserId(req),
      reason: req.body?.reason || '',
    });
    res.json({ message: 'PO canceled' });
  } catch (e) {
    const sc = e.code?.startsWith('PO_') ? 400 : 500;
    res.status(sc).json({ message: e.message || 'Failed to cancel PO' });
  }
};

// ──────────────── Files ────────────────
exports.listFiles = async (req, res) => {
  try {
    res.json(await poModel.listFiles(+req.params.id));
  } catch (e) {
    console.error('po.listFiles error:', e);
    res.status(500).json({ message: 'Failed to list files' });
  }
};

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const fileUrl = `/uploads/po/${req.file.filename}`;
    const fileId = await poModel.addFile({
      poId: +req.params.id,
      file_name: req.file.originalname,
      file_path: req.file.path,
      file_url: fileUrl,
      uploaded_by: getUserId(req),
    });
    res.status(201).json({ file_id: fileId, file_url: fileUrl });
  } catch (e) {
    console.error('po.uploadFile error:', e);
    res.status(500).json({ message: 'Failed to upload file' });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    await poModel.deleteFile({
      poId: +req.params.id,
      fileId: +req.params.file_id,
    });
    res.json({ message: 'File deleted' });
  } catch (e) {
    console.error('po.deleteFile error:', e);
    res.status(500).json({ message: 'Failed to delete file' });
  }
};
