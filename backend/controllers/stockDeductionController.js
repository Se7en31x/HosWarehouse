// backend/controllers/stockDeductionController.js
const stockDeductionModel = require('../models/stockDeductionModel'); // ตรวจสอบ Path ให้ถูกต้อง

// Controller สำหรับดึงรายการคำขอที่พร้อมเบิก-จ่าย
async function getRequestsReadyForDeduction(req, res) {
  try {
    const requests = await stockDeductionModel.getApprovedRequestsForDeduction();
    res.json(requests);
  } catch (error) {
    console.error('Error in getRequestsReadyForDeduction Controller:', error.message);
    res.status(500).json({ message: 'Failed to retrieve requests ready for deduction.', error: error.message });
  }
}

// Controller สำหรับดึงรายละเอียดคำขอเพื่อจัดการสถานะ
async function getDeductionRequestDetails(req, res) {
  try {
    const { requestId } = req.params;
    // เรียกใช้ฟังก์ชันที่ถูกต้องจาก Model
    const requestDetails = await stockDeductionModel.getRequestDetailsForProcessing(requestId); 

    if (!requestDetails) {
      return res.status(404).json({ message: 'Request not found.' });
    }
    res.json(requestDetails);
  } catch (error) {
    console.error(`Error in getDeductionRequestDetails Controller for request ${req.params.requestId}:`, error.message);
    res.status(500).json({ message: 'Failed to retrieve request details for deduction.', error: error.message });
  }
}

// Controller สำหรับอัปเดตสถานะการดำเนินการและตัดสต็อก
async function processStockDeduction(req, res) {
  try {
    const { requestId } = req.params;
    const { updates, userId } = req.body;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: 'Invalid input: "updates" array is required and must not be empty.' });
    }
    if (!userId) {
      return res.status(400).json({ message: 'Invalid input: "userId" is required.' });
    }

    const result = await stockDeductionModel.deductStock(requestId, updates, userId);
    res.json(result);
  } catch (error) {
    console.error('Error in processStockDeduction Controller:', error.message);
    res.status(500).json({ message: error.message || 'Failed to process stock deduction.' });
  }
}

module.exports = {
  getRequestsReadyForDeduction,
  getDeductionRequestDetails,
  processStockDeduction,
};