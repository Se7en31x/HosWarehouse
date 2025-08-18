// controllers/manageReturnController.js
const manageReturnModel = require('../models/manageReturnModel');

exports.getBorrowQueue = async (req, res) => {
  try {
    const { q = '', status = '', page = 1, limit = 12 } = req.query || {};
    const result = await manageReturnModel.getBorrowQueue({ q, status, page, limit });
    return res.status(200).json(result);
  } catch (err) {
    console.error('getBorrowQueue error:', err);
    return res.status(500).json({ message: 'Internal error' });
  }
};

exports.getManageReturnDetail = async (req, res) => {
  try {
    const { request_id } = req.params;
    const result = await manageReturnModel.getManageReturnDetail(Number(request_id));
    return res.status(200).json(result);
  } catch (err) {
    console.error('getManageReturnDetail error:', err);
    return res.status(500).json({ message: 'Internal error' });
  }
};

exports.receiveReturn = async (req, res) => {
  try {
    let { request_detail_id, qty_return, condition, note, inspected_by } = req.body || {};
    request_detail_id = Number(request_detail_id);
    const return_qty = Number(qty_return); // รองรับชื่อฟิลด์จาก frontend เดิม
    inspected_by = inspected_by ? Number(inspected_by) : null;
    condition = (condition || 'normal').toLowerCase();

    if (!Number.isInteger(request_detail_id) || !Number.isFinite(return_qty) || return_qty <= 0) {
      return res.status(400).json({ message: 'Invalid request_detail_id or qty_return' });
    }

    const result = await manageReturnModel.receiveReturn({
      request_detail_id,
      return_qty,
      condition,
      note,
      inspected_by
    });

    return res.status(200).json(result);
  } catch (err) {
    const msg = err?.message || '';
    if (
      [
        'request_detail_id not found or invalid',
        'NO_REMAINING_TO_RETURN',
        'Invalid return_qty: Cannot be less than 1 or more than remaining quantity'
      ].some(k => msg.startsWith(k))
    ) {
      return res.status(400).json({ message: msg });
    }
    console.error('receiveReturn error:', err);
    return res.status(500).json({ message: 'Internal error' });
  }
};
