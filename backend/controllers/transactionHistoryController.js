// backend/controllers/transactionHistoryController.js
const TransactionHistory = require('../models/transactionHistoryModel');

/**
 * Map ชื่อประเภทจาก UI → ค่ากลุ่มที่ Model ใช้จริง
 * รองรับทั้งชื่อไทยเดิม และ enum อังกฤษแบบใหม่
 */
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

// ค่าที่ยอมรับจริง
const VALID_GROUP_TYPES = new Set([
  'CREATE_REQUEST',
  'APPROVAL',
  'PROCESSING',
  'IMPORT',
  'RETURN',
  'STOCK_MOVEMENT',
]);

/** แปลงค่า type จาก query ให้เป็นค่าที่ Model ใช้ */
function normalizeType(rawType) {
  if (!rawType) return '';
  const mapped = TYPE_MAP[rawType] ?? rawType;
  if (mapped === '' || VALID_GROUP_TYPES.has(mapped)) return mapped;
  return null;
}

/** แปลง group จาก query เป็น boolean */
function normalizeGroup(raw) {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') {
    const v = raw.toLowerCase();
    return v === 'true' || v === '1';
  }
  return Boolean(raw);
}

/** แปลง request_type → ไทย: เบิก / ยืม */
function toThaiRequestMode(v) {
  if (!v) return 'เบิก';
  const s = String(v).toLowerCase();
  return (s === 'borrow' || s === 'ยืม') ? 'ยืม' : 'เบิก';
}

const transactionHistoryController = {
  /**
   * @route GET /api/transaction-history
   * ประวัติแบบรวม (มี group=true เพื่อรวมเป็นก้อนต่อ reference_code)
   */
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

      if (isNaN(parsedPage) || parsedPage <= 0 || isNaN(parsedLimit) || parsedLimit <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid page or limit values' });
      }

      const normalizedType = normalizeType(type);
      if (normalizedType === null) {
        return res.status(400).json({ success: false, message: 'Invalid transaction type value' });
      }

      const result = await TransactionHistory.getAllFilteredLogs({
        page: parsedPage,
        limit: parsedLimit,
        type: normalizedType,
        search,
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
      console.error('Error in getAllLogs controller:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error when fetching transaction logs',
        error: error.message,
      });
    }
  },

  /**
   * @route GET /api/transaction-history/request/:requestId
   * รายละเอียดคำขอ: summary + history + line items
   */
  async getRequestDetails(req, res) {
    // รองรับทั้ง :id และ :requestId
    const idParam = req.params.requestId ?? req.params.id;

    try {
      const parsedRequestId = parseInt(idParam, 10);
      if (isNaN(parsedRequestId)) {
        return res.status(400).json({ success: false, message: 'Invalid request ID' });
      }

      const [summary, history, lineItems] = await Promise.all([
        TransactionHistory.getRequestSummary(parsedRequestId),
        TransactionHistory.getApprovalAndStatusHistoryByRequestId(parsedRequestId),
        TransactionHistory.getRequestLineItems(parsedRequestId),
      ]);

      if (!summary) {
        return res
          .status(404)
          .json({ success: false, message: `Request with ID ${parsedRequestId} not found.` });
      }

      // derive ชนิดไทยจากรายการย่อย ถ้า header ไม่ระบุ
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
        },
      });

    } catch (error) {
      console.error(`Error in getRequestDetails for request ID ${idParam}:`, error);
      return res.status(500).json({
        success: false,
        message: 'Server Error: Could not fetch request details.',
        error: error.message,
      });
    }
  },

  /**
   * @route GET /api/transaction-history/stock-movement?move_code=XXXX
   * รายละเอียด “ก้อน” การจัดการสต็อก (เช่นตัดสต็อก) ตาม move_code
   */
  async getStockMovementByCode(req, res) {
    try {
      const { move_code } = req.query;
      if (!move_code) {
        return res.status(400).json({ success: false, message: 'move_code is required' });
      }

      const rows = await TransactionHistory.getStockMovementByCode(move_code);
      // ไม่ถือว่า 404 แม้ไม่พบ — ให้คืน array ว่าง เพื่อให้ UI แสดง “ไม่มีรายการในก้อนนี้”
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
