// backend/controllers/rfqController.js
const rfqModel = require('../models/rfqModel');

// ✅ ประกาศฟังก์ชันด้วย const
const handleCreateRfq = async (req, res) => {
    const { created_by, pr_id, items_to_rfq } = req.body;

    if (!created_by || !pr_id || !items_to_rfq || items_to_rfq.length === 0) {
        return res.status(400).json({ message: 'ข้อมูลไม่ครบถ้วน' });
    }

    try {
        const result = await rfqModel.createRfq(created_by, items_to_rfq, pr_id);
        res.status(201).json({
            message: 'สร้างใบขอราคาสำเร็จ',
            rfqId: result.rfq_id,
            rfqNo: result.rfq_no
        });
    } catch (error) {
        console.error('Error in handleCreateRfq:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างใบขอราคา' });
    }
};

// ✅ ประกาศฟังก์ชันด้วย const
const handleGetAllRfq = async (req, res) => {
    try {
        const rfqList = await rfqModel.getAllRfq();
        res.status(200).json(rfqList);
    } catch (error) {
        console.error('Error in handleGetAllRfq:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายการ RFQ' });
    }
};

// ✅ ประกาศฟังก์ชันด้วย const
const handleGetRfqById = async (req, res) => {
    const { rfq_id } = req.params;
    try {
        const rfqDetails = await rfqModel.getRfqById(rfq_id);
        if (!rfqDetails) {
            return res.status(404).json({ message: 'ไม่พบรายการ RFQ' });
        }
        res.status(200).json(rfqDetails);
    } catch (error) {
        console.error('Error in handleGetRfqById:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรายละเอียด RFQ' });
    }
};

// ✅ ส่วนสำคัญ: ต้อง export ฟังก์ชันทั้งหมดออกมา
module.exports = {
    handleCreateRfq,
    handleGetAllRfq,
    handleGetRfqById
};