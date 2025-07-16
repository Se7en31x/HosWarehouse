const stockDeductionModel = require('../models/stockDeductionModel'); // Import your model functions

// Controller for fetching the list of approved requests for the overview page
exports.getApprovedRequests = async (req, res) => {
  try {
    const requests = await stockDeductionModel.getApprovedRequestsForDeduction();

    if (!requests || requests.length === 0) {
      // It's good practice to send 200 OK with an empty array if no data, not 404
      return res.status(200).json([]);
    }

    // Map the database field names to frontend-friendly names if necessary,
    // though the query already aliases them for clarity.
    const formattedRequests = requests.map(req => ({
      request_id: req.request_id, // Keep request_id for internal linking
      request_code: req.request_code,
      request_date: req.request_date,
      requester: req.requester_name, // Aliased in SQL query
      department: req.department,
      type: req.request_type,
      status: req.request_status,
    }));

    res.status(200).json(formattedRequests);
  } catch (error) {
    console.error('Error in stockDeductionController.getApprovedRequests:', error);
    // Send a generic 500 error, detailed error logging happens in the model
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Controller for fetching details of a single request (for the detailed page)
exports.getRequestDetails = async (req, res) => {
  try {
    const { requestId } = req.params; // Get requestId from URL parameters

    // Basic validation for requestId
    if (!requestId || isNaN(parseInt(requestId))) {
      return res.status(400).json({ message: 'Invalid Request ID provided.' });
    }

    const requestDetails = await stockDeductionModel.getRequestDetailsForDeduction(parseInt(requestId));

    if (!requestDetails) {
      return res.status(404).json({ message: 'Request not found or not in eligible status for deduction.' });
    }

    // You might want to format the response data here before sending it
    // For now, let's send it as is if the model returns it formatted.
    res.status(200).json(requestDetails);

  } catch (error) {
    console.error('Error in stockDeductionController.getRequestDetails:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Controller for handling the actual stock deduction
exports.deductStock = async (req, res) => {
  try {
    const { requestId, items } = req.body;
    // ในสถานการณ์จริง คุณควรดึง userId จาก session/token ของผู้ใช้งานที่ล็อกอินอยู่
    const userId = 1; // *** สมมติ userId เป็น 1 สำหรับการทดสอบ *** // *** คุณต้องเปลี่ยนเป็น userId จริงจากระบบ Authentication ของคุณ ***

    if (!requestId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Invalid request data for stock deduction.' });
    }

    // เรียกใช้ Model function เพื่อดำเนินการตัดสต็อก
    const result = await stockDeductionModel.deductStock(requestId, items, userId);

    res.status(200).json({ message: 'Stock deducted successfully', result });
  } catch (error) {
    console.error('Error in stockDeductionController.deductStock:', error);
    // ส่งข้อความ error ที่ชัดเจนกลับไปให้ Frontend
    res.status(500).json({ message: error.message || 'Failed to deduct stock.' });
  }
};
