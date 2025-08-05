// controllers/transactionHistoryController.js
const TransactionHistory = require('../models/transactionHistoryModel');

// กำหนดประเภทการทำรายการที่ถูกต้องให้ตรงกับ Frontend และ Model
const allValidTypes = [
    'เบิก',
    'ยืม',
    'คืน',
    'เพิ่ม/นำเข้า',
    'ปรับปรุงสต็อก',
    'โอนย้าย',
    'ยกเลิก/ชำรุด',
    'การเปลี่ยนสถานะอนุมัติ',
    'การเปลี่ยนสถานะดำเนินการ',
];

const transactionHistoryController = {
    /**
     * ดึงประวัติการทำรายการทั้งหมดจากหลายตารางสำหรับหน้าประวัติแบบรวม
     * รองรับการ Filter, Search, Sort, และ Pagination
     * @param {object} req - Request object
     * @param {object} res - Response object
     */
    async getAllLogs(req, res) {
        try {
            // ดึง Query Parameter ที่ frontend ส่งมา
            const { page = 1, limit = 10, type, search, sort_by = 'timestamp', sort_order = 'desc' } = req.query;

            // ตรวจสอบค่า type ที่ส่งมา ถ้ามีการส่งมาต้องเป็นค่าที่ถูกต้อง
            if (type && !allValidTypes.includes(type)) {
                return res.status(400).json({ message: 'Invalid transaction type value' });
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
                type,
                search,
                sort_by,
                sort_order,
            });

            res.status(200).json({
                data: result.logs,
                total_pages: result.totalPages,
                current_page: result.currentPage,
                total_count: result.totalCount,
            });

        } catch (error) {
            console.error('Error in getAllLogs:', error);
            res.status(500).json({ message: 'Server error when fetching transaction logs', error: error.message });
        }
    },
};

module.exports = transactionHistoryController;