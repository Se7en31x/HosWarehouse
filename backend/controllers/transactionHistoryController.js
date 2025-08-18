// backend/controllers/transactionHistoryController.js
const TransactionHistory = require('../models/transactionHistoryModel');

/** Map ประเภทจาก UI → group_type ใน DB */
const TYPE_MAP = {
  // กลุ่มคำขอ
  CREATE_REQUEST: 'CREATE_REQUEST',
  APPROVAL: 'APPROVAL',
  PROCESSING: 'PROCESSING',

  // กลุ่มอื่น ๆ
  IMPORT: 'IMPORT',
  RETURN: 'RETURN',
  STOCK_MOVEMENT: 'STOCK_MOVEMENT',

  // ชื่อไทยเดิม → map ไปเป็นกลุ่มใหม่
  'คำขอเบิก (สร้างคำขอ)': 'CREATE_REQUEST',
  'คำขอเบิก (อนุมัติ)': 'APPROVAL',
  'คำขอเบิก (ดำเนินการ)': 'PROCESSING',

  // UI เก่าแบบกว้าง ๆ
  'คำขอเบิก': '',
  'นำเข้า': 'IMPORT',
  'คืนสินค้า': 'RETURN',
  'จัดการสต็อก': 'STOCK_MOVEMENT',
};

const VALID_GROUP_TYPES = new Set([
  'CREATE_REQUEST',
  'APPROVAL',
  'PROCESSING',
  'IMPORT',
  'RETURN',
  'STOCK_MOVEMENT',
]);

function normalizeType(rawType) {
  if (!rawType) return '';
  const mapped = TYPE_MAP[rawType] ?? rawType;
  if (mapped === '' || VALID_GROUP_TYPES.has(mapped)) return mapped;
  return null;
}

function normalizeGroup(raw) {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') {
    const v = raw.toLowerCase();
    return v === 'true' || v === '1';
  }
  return Boolean(raw);
}

function toThaiRequestMode(v) {
  if (!v) return 'เบิก';
  const s = String(v).toLowerCase();
  return (s === 'borrow' || s === 'ยืม') ? 'ยืม' : 'เบิก';
}

const transactionHistoryController = {
  /** GET /api/transaction-history */
  async getAllLogs(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        type,
        search,
        sort_by = 'timestamp',
        sort_order = 'desc',
        group = 'true',
      } = req.query;

      const parsedPage = parseInt(page, 10);
      const parsedLimit = parseInt(limit, 10);
      if (!Number.isInteger(parsedPage) || parsedPage <= 0 || !Number.isInteger(parsedLimit) || parsedLimit <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid page or limit values' });
      }

      const normalizedType = normalizeType(type);
      if (normalizedType === null) {
        return res.status(400).json({ success: false, message: 'Invalid transaction type value' });
      }

      const result = await TransactionHistory.getAllFilteredLogs({
        page: parsedPage,
        limit: parsedLimit,
        type: normalizedType || undefined,      // '' => undefined เพื่อชัดเจนว่าไม่กรอง
        search: (search ?? '').trim() || undefined,
        sort_by,
        sort_order,
        group: normalizeGroup(group),
      });

      return res.status(200).json({
        success: true,
        data: result.data,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        totalCount: result.totalCount,
      });
    } catch (error) {
      console.error('Error in getAllLogs controller:', {
        message: error.message,
        stack: error.stack,
        query: req.query,
      });
      return res.status(500).json({
        success: false,
        message: 'Server error when fetching transaction logs',
        error: error.message,
      });
    }
  },

  /** GET /api/transaction-history/request/:requestId */
  async getRequestDetails(req, res) {
    const idParam = req.params.requestId ?? req.params.id;
    try {
      const parsedRequestId = parseInt(idParam, 10);
      if (!Number.isInteger(parsedRequestId)) {
        return res.status(400).json({ success: false, message: 'Invalid request ID' });
      }

      const [summary, history, lineItems, returnHistory] = await Promise.all([
        TransactionHistory.getRequestSummary(parsedRequestId),
        TransactionHistory.getApprovalAndStatusHistoryByRequestId(parsedRequestId),
        TransactionHistory.getRequestLineItems(parsedRequestId),
        TransactionHistory.getReturnHistoryByRequestId(parsedRequestId),
      ]);

      if (!summary) {
        return res.status(404).json({ success: false, message: `Request with ID ${parsedRequestId} not found.` });
      }

      const derivedTypeThai =
        (Array.isArray(lineItems) && lineItems.some(li => (li.request_mode_thai || '').trim() === 'ยืม'))
          ? 'ยืม'
          : toThaiRequestMode(summary.request_type);

      const summaryWithMode = {
        ...summary,
        request_type_thai: summary.request_type_thai || derivedTypeThai,
      };

      return res.status(200).json({
        success: true,
        data: {
          summary: summaryWithMode,
          history,
          lineItems,
          returnHistory,
        },
      });
    } catch (error) {
      console.error(`Error in getRequestDetails for request ID ${idParam}:`, {
        message: error.message,
        stack: error.stack,
      });
      return res.status(500).json({
        success: false,
        message: 'Server Error: Could not fetch request details.',
        error: error.message,
      });
    }
  },

  /** GET /api/transaction-history/request/:requestId/returns/history */
  async getRequestReturnHistory(req, res) {
    const idParam = req.params.requestId ?? req.params.id;
    try {
      const parsedRequestId = parseInt(idParam, 10);
      if (!Number.isInteger(parsedRequestId)) {
        return res.status(400).json({ success: false, message: 'Invalid request ID' });
      }
      const rows = await TransactionHistory.getReturnHistoryByRequestId(parsedRequestId);
      return res.status(200).json({ success: true, data: rows });
    } catch (error) {
      console.error(`Error in getRequestReturnHistory for request ID ${idParam}:`, error);
      return res.status(500).json({
        success: false,
        message: 'Server Error: Could not fetch return history.',
        error: error.message,
      });
    }
  },

  /** GET /api/transaction-history/stock-movement?move_code=XXXX */
  async getStockMovementByCode(req, res) {
    try {
      const { move_code } = req.query;
      if (!move_code) {
        return res.status(400).json({ success: false, message: 'move_code is required' });
      }
      const rows = await TransactionHistory.getStockMovementByCode(move_code);
      return res.status(200).json({ success: true, data: rows });
    } catch (error) {
      console.error('Error in getStockMovementByCode:', error);
      return res.status(500).json({
        success: false,
        message: 'Server Error: Could not fetch stock movement details.',
        error: error.message,
      });
    }
  },
};

module.exports = transactionHistoryController;
