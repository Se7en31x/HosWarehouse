// controllers/requestStatusController.js
const RequestStatusModel = require('../models/requestStatusModel');
const moment = require('moment-timezone');
const { getIO } = require('../socket');

const calculateOverallProcessingStatusBackend = (details) => {
    const processingStatusSteps = ['pending', 'preparing', 'delivering', 'completed'];
    const approvedDetails = details.filter(d => d.approval_status === 'approved');
    if (approvedDetails.length === 0) {
        return 'no_approved_for_processing';
    }
    const statuses = approvedDetails.map(d => d.processing_status);
    if (statuses.every(s => s === 'completed')) return 'completed';
    if (statuses.some(s => s === 'preparing')) return 'preparing';
    if (statuses.every(s => s === 'pending')) return 'pending';
    if (statuses.some(s => s === 'delivering') && !statuses.some(s => s === 'preparing')) return 'delivering';
    if (statuses.some(s => processingStatusSteps.includes(s) && s !== 'completed') && !statuses.every(s => s === 'pending')) {
        return 'partially_processed';
    }
    if (statuses.some(s => s === null || s === '')) return 'waiting_for_processing_selection';
    return 'unknown_processing_state';
};

class RequestStatusController {
    static async getRequestsByStatus(req, res) {
        try {
            const statusQuery = req.query.status;
            let allowedStatuses = [];
            if (statusQuery) {
                allowedStatuses = statusQuery.split(',');
            }
            console.log(`Backend: Filtering requests by statuses: ${allowedStatuses.join(', ')}`);
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
        const { updates, userId, newOverallProcessingStatus } = req.body;
        const parsedRequestId = parseInt(requestId, 10);
        if (isNaN(parsedRequestId)) {
            return res.status(400).json({ message: 'Invalid Request ID provided.' });
        }
        if (!updates || !Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ message: 'Updates array is required and must not be empty.' });
        }
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required for logging history.' });
        }
        try {
            const overallStatusToUpdate = newOverallProcessingStatus;
            await RequestStatusModel.updateProcessingStatusbatch(
                parsedRequestId,
                updates,
                overallStatusToUpdate,
                userId
            );
            const io = getIO();
            io.emit('requestUpdated', { request_id: parsedRequestId });
            res.status(200).json({ message: 'Processing statuses and overall status updated successfully.' });
        } catch (error) {
            console.error('Error in RequestStatusController.updateProcessingStatusBatch:', error);
            res.status(500).json({ message: 'Failed to update processing statuses.', error: error.message });
        }
    }

    // เพิ่มฟังก์ชันใหม่นี้
    static async updateOverallProcessingStatus(req, res) {
        const { requestId } = req.params;
        const { newOverallProcessingStatus, userId } = req.body;
        const parsedRequestId = parseInt(requestId, 10);
        if (isNaN(parsedRequestId)) {
            return res.status(400).json({ message: 'Invalid Request ID provided.' });
        }
        if (!newOverallProcessingStatus) {
            return res.status(400).json({ message: 'New overall processing status is required.' });
        }
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required for logging history.' });
        }
        try {
            await RequestStatusModel.updateOverallProcessingStatus(parsedRequestId, newOverallProcessingStatus, userId);
            const io = getIO();
            io.emit('requestUpdated', { request_id: parsedRequestId });
            res.status(200).json({ message: 'Overall processing status updated successfully.' });
        } catch (error) {
            console.error('Error in RequestStatusController.updateOverallProcessingStatus:', error);
            res.status(500).json({ message: 'Failed to update overall processing status.', error: error.message });
        }
    }
}
module.exports = RequestStatusController;