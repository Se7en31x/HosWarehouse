const TransactionHistory = require('../models/transactionHistoryModel'); // ตรวจสอบ path ให้ถูกต้อง

// เพิ่มสถานะทั้งหมดที่ frontend อาจส่งมา และ backend รู้จัก
const allValidStatuses = [
    'pending', 'approved', 'cancelled', 'completed',
    'waiting_approval', 'issued', 'returned', 'rejected',
    'approved_partial', 'rejected_partial', 'approved_all', 'rejected_all',
    'preparing', 'delivering' // เพิ่มสถานะเหล่านี้
];

const transactionHistoryController = {
    // ฟังก์ชัน getAllHistories (อาจไม่จำเป็นต้องใช้แล้ว หากใช้ getAllLogs แทน)
    async getAllHistories(req, res) {
        try {
            const result = await TransactionHistory.getAll();
            res.status(200).json(result);
        } catch (err) {
            console.error('Error in getAllHistories:', err);
            res.status(500).json({ error: 'Failed to fetch history' });
        }
    },

    // ฟังก์ชัน getHistoryByTransactionId (สำหรับดึงประวัติของ request_id เดียว)
    async getHistoryByTransactionId(req, res) {
        try {
            const { request_id } = req.params; // เปลี่ยนชื่อจาก transactionId เป็น request_id
            const result = await TransactionHistory.getByTransactionId(request_id);
            res.status(200).json(result);
        } catch (err) {
            console.error('Error in getHistoryByTransactionId:', err);
            res.status(500).json({ error: 'Failed to fetch request history' });
        }
    },

    // ฟังก์ชัน createHistory (สำหรับสร้างประวัติใหม่)
    async createHistory(req, res) {
        try {
            const data = req.body;
            // ตรวจสอบข้อมูลที่รับเข้ามาว่ามีคอลัมน์ที่จำเป็นครบถ้วนสำหรับ request_status_history
            if (!data.request_id || !data.changed_by || !data.old_status || !data.new_status) {
                return res.status(400).json({ message: 'Missing required fields for history creation.' });
            }
            const result = await TransactionHistory.create(data);
            res.status(201).json(result);
        } catch (err) {
            console.error('Error in createHistory:', err);
            res.status(500).json({ error: 'Failed to create transaction history' });
        }
    },

    // ฟังก์ชันหลักที่ Frontend จะเรียกใช้สำหรับหน้าประวัติ
    async getAllLogs(req, res) {
        try {
            const { page = 1, limit = 10, status, search, sort, order } = req.query;

            // ตรวจสอบค่า status ถ้ามีการส่งมา
            if (status && !allValidStatuses.includes(status)) {
                return res.status(400).json({ message: 'Invalid status value' });
            }

            // แปลง page และ limit เป็นตัวเลข
            const parsedPage = parseInt(page, 10);
            const parsedLimit = parseInt(limit, 10);

            if (isNaN(parsedPage) || parsedPage <= 0 || isNaN(parsedLimit) || parsedLimit <= 0) {
                return res.status(400).json({ message: 'Invalid page or limit values' });
            }

            // เรียกใช้ฟังก์ชันจาก Model ที่รองรับ Filter, Search, Sort, Pagination
            const result = await TransactionHistory.getAllFilteredLogs({
                page: parsedPage,
                limit: parsedLimit,
                status,
                search,
                sort,
                order,
            });

            res.status(200).json({
                logs: result.logs,
                totalPages: result.totalPages,
                currentPage: result.currentPage,
                totalCount: result.totalCount,
            });

        } catch (error) {
            console.error('Error in getAllLogs:', error);
            res.status(500).json({ message: 'Server error when fetching transaction logs', error: error.message });
        }
    },
};

module.exports = transactionHistoryController;