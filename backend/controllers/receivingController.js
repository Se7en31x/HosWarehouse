const receivingModel = require("../models/receivingModel");

/**
 * ดึงรายการสินค้าทั้งหมด (สำหรับหน้าเลือกสินค้า)
 * GET /api/receiving
 */
exports.handleGetAllItems = async (req, res) => {
  try {
    const items = await receivingModel.getAllItems();
    res.status(200).json(items);
  } catch (error) {
    console.error("❌ Error in handleGetAllItems:", error);
    res.status(500).json({ message: "Failed to fetch items", error: error.message });
  }
};

/**
 * ค้นหาสินค้าด้วย Barcode
 * GET /api/receiving/barcode?barcode=xxx
 */
exports.handleFindItemByBarcode = async (req, res) => {
  try {
    const { barcode } = req.query;
    if (!barcode) {
      return res.status(400).json({ message: "Barcode is required" });
    }

    const cleanBarcode = barcode.trim();
    const item = await receivingModel.findItemByBarcode(cleanBarcode);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.status(200).json(item);
  } catch (error) {
    console.error("❌ Error in handleFindItemByBarcode:", error);
    res.status(500).json({ message: "Failed to find item", error: error.message });
  }
};

/**
 * บันทึกรายการรับเข้าสินค้า
 * POST /api/receiving
 */
exports.handleRecordReceiving = async (req, res) => {
  try {
    const { receiving_note, import_type, source_name, receivingItems } = req.body;
    const userId = req.user?.id; // ✅ ใช้จาก token ที่ authMiddleware ใส่ให้

    // Validation หลัก
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: userId missing in token" });
    }
    if (!receivingItems || receivingItems.length === 0) {
      return res.status(400).json({ message: "At least one item is required" });
    }

    // Validation รายการสินค้าแต่ละตัว
    for (const item of receivingItems) {
      if (!item.item_id || !item.quantity) {
        return res.status(400).json({
          message: "Each item must have an item_id and quantity.",
        });
      }
    }

    const result = await receivingModel.recordReceiving({
      user_id: userId,
      receiving_note,
      stockin_type: import_type || "general",
      source_name,
      receivingItems,
    });

    res.status(201).json({
      message: "Items received successfully",
      receivingId: result.stockin_id,
      stockinNo: result.stockin_no,
    });
  } catch (error) {
    console.error("❌ Error in handleRecordReceiving:", error);
    res.status(500).json({
      message: "Failed to save receiving items",
      error: error.message,
    });
  }
};

