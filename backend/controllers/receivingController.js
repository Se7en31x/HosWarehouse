const receivingModel = require("../models/receivingModel");

/**
 * Controller Function: จัดการ Logic การดึงข้อมูลสินค้าทั้งหมด
 * Endpoint: GET /api/receiving
 */
exports.handleGetAllItems = async (req, res) => {
    try {
        const items = await receivingModel.getAllItems();
        res.status(200).json(items);
    } catch (error) {
        console.error("Error in handleGetAllItems:", error);
        res.status(500).json({ message: 'Failed to fetch items', error: error.message });
    }
};

/**
 * Controller Function: จัดการ Logic การค้นหาสินค้าด้วย Barcode
 * Endpoint: GET /api/receiving/barcode?barcode=<value>
 */
exports.handleFindItemByBarcode = async (req, res) => {
    try {
        const { barcode } = req.query; // ดึงค่า barcode จาก query string

        if (!barcode) {
            return res.status(400).json({ message: 'Barcode is required' });
        }

        const item = await receivingModel.findItemByBarcode(barcode);

        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        res.status(200).json(item);
    } catch (error) {
        console.error("Error in handleFindItemByBarcode:", error);
        res.status(500).json({ message: 'Failed to find item', error: error.message });
    }
};

/**
 * Controller Function: จัดการ Logic การบันทึกการรับเข้าสินค้า
 * Endpoint: POST /api/receiving
 */
exports.handleRecordReceiving = async (req, res) => {
    try {
        const { user_id, receiving_note, import_type, source_name, receivingItems } = req.body;

        // Validation หลัก
        if (!user_id || !receivingItems || receivingItems.length === 0) {
            return res.status(400).json({ message: 'User ID and at least one item are required' });
        }

        // Validation รายการสินค้าแต่ละตัว
        for (const item of receivingItems) {
            if (!item.item_id || !item.quantity || !item.lotNo) {
                return res.status(400).json({
                    message: 'Each item must have an item_id, quantity, and a lot number.'
                });
            }
        }

        const result = await receivingModel.recordReceiving({
            user_id,
            receiving_note,
            import_type,
            source_name,
            receivingItems
        });

        res.status(201).json({
            message: 'Items received successfully',
            receivingId: result.import_id
        });
    } catch (error) {
        console.error("Error in handleRecordReceiving:", error);
        res.status(500).json({ message: 'Failed to save receiving items', error: error.message });
    }
};