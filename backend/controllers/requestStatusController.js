const RequestStatusModel = require('../models/requestStatusModel');
const moment = require('moment-timezone');
const { getIO } = require('../socket');

class RequestStatusController {
    static async getRequestsByStatus(req, res) {
        try {
            const statusQuery = req.query.status;
            let allowedStatuses = [];
            if (statusQuery) {
                allowedStatuses = statusQuery.split(',');
            }
            const requests = await RequestStatusModel.getRequestsByStatuses(allowedStatuses);
            res.status(200).json(requests);
        } catch (error) {
            console.error('Error fetching requests by status:', error);
            res.status(500).json({
                message: 'Failed to retrieve requests by status.',
                error: error.message
            });
        }
    }

    static async getRequestById(req, res) {
        const { request_id } = req.params;
        try {
            const data = await RequestStatusModel.getRequestDetails(parseInt(request_id, 10));
            if (!data) {
                return res.status(404).json({ message: 'ไม่พบคำขอ' });
            }
            if (data.request && data.request.request_date) {
                data.request.request_date = moment(data.request.request_date).tz('Asia/Bangkok').format();
            }
            if (data.request && data.request.updated_at) {
                data.request.updated_at = moment(data.request.updated_at).tz('Asia/Bangkok').format();
            }
            data.details = data.details.map(detail => {
                if (detail.updated_at) {
                    detail.updated_at = moment(detail.updated_at).tz('Asia/Bangkok').format();
                }
                if (detail.expected_return_date) {
                    detail.expected_return_date = moment(detail.expected_return_date).tz('Asia/Bangkok').format('YYYY-MM-DD');
                }
                return detail;
            });
            return res.json(data);
        } catch (error) {
            console.error('เกิดข้อผิดพลาดใน Controller (getRequestById):', error);
            return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์', error: error.message });
        }
    }

    static async updateProcessingStatusBatch(req, res) {
    const { requestId } = req.params;
    const { updates } = req.body;
    const parsedRequestId = parseInt(requestId, 10);

    if (isNaN(parsedRequestId)) {
        return res.status(400).json({ message: 'Invalid Request ID provided.' });
    }
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ message: 'Updates array is required and must not be empty.' });
    }

    // ✅ ดึง user id จาก token middleware
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized: User ID not found in token.' });
    }

    try {
        await RequestStatusModel.updateProcessingStatusbatch(
            parsedRequestId,
            updates,
            userId
        );

        const io = getIO();
        io.emit('requestUpdated', { request_id: parsedRequestId });

        res.status(200).json({ message: 'Processing statuses updated successfully.' });
    } catch (error) {
        console.error('Error in RequestStatusController.updateProcessingStatusBatch:', error);
        res.status(500).json({ message: 'Failed to update processing statuses.', error: error.message });
    }
}
}
module.exports = RequestStatusController;