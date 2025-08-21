// controllers/prController.js
const prModel = require('../models/prModel');

// จัดการคำขอสร้างใบขอซื้อ
exports.handleCreatePurchaseRequest = async (req, res) => {
    const { requester_id, items_to_purchase } = req.body;

    if (!requester_id || !items_to_purchase || items_to_purchase.length === 0) {
        return res.status(400).json({ message: 'ข้อมูลคำขอไม่ครบถ้วน' });
    }

    try {
        const result = await prModel.createPurchaseRequest(requester_id, items_to_purchase);
        res.status(201).json({
            message: 'สร้างคำขอซื้อสำเร็จ',
            prId: result.pr_id,
            prNo: result.pr_no
        });
    } catch (error) {
        console.error('Error in handleCreatePurchaseRequest:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
    }
};

// จัดการคำขอดึงรายการสินค้า
exports.getItems = async (req, res) => {
    try {
        const items = await prModel.getAllItems();
        res.status(200).json(items);
    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า' });
    }
};

// จัดการคำขอเพื่อดึงรายการ PR ทั้งหมด
exports.handleGetAllPurchaseRequests = async (req, res) => {
    try {
        const purchaseRequests = await prModel.getAllPurchaseRequests();
        res.status(200).json(purchaseRequests);
    } catch (error) {
        console.error('Error in handleGetAllPurchaseRequests:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายการคำขอซื้อ' });
    }
};

// จัดการคำขอดึงรายละเอียด PR ตาม ID
exports.handleGetPurchaseRequestById = async (req, res) => {
    const { pr_id } = req.params;

    try {
        const purchaseRequest = await prModel.getPurchaseRequestById(pr_id);
        if (!purchaseRequest) {
            return res.status(404).json({ message: 'ไม่พบรายการคำขอซื้อ' });
        }
        res.status(200).json(purchaseRequest);
    } catch (error) {
        console.error('Error in handleGetPurchaseRequestById:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายการคำขอซื้อ' });
    }
};

// ✅ ฟังก์ชันใหม่: จัดการอัปเดตสถานะ PR
exports.handleUpdatePrStatus = async (req, res) => {
    const { pr_id } = req.params;
    const { status } = req.body; // รับสถานะใหม่จาก body

    if (!status) {
        return res.status(400).json({ message: 'ต้องระบุสถานะใหม่' });
    }

    try {
        const updatedPr = await prModel.updatePrStatus(pr_id, status);
        if (!updatedPr) {
            return res.status(404).json({ message: 'ไม่พบรายการคำขอซื้อที่ต้องการอัปเดต' });
        }
        res.status(200).json({ message: `อัปเดตสถานะเป็น ${status} สำเร็จ`, updatedPr });
    } catch (error) {
        console.error('Error in handleUpdatePrStatus:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะ' });
    }
};