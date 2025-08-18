// controllers/itemController.js
const { createItemWithDetail } = require('../models/addItemModel');
const { getIO } = require('../socket');
const fs = require('fs');
const path = require('path');

function deleteUploadedFile(filePath) {
  if (filePath && fs.existsSync(path.join('uploads', filePath))) {
    fs.unlinkSync(path.join('uploads', filePath));
  }
}

exports.addNewItem = async (req, res) => {
  const file = req.file ? req.file.filename : null;
  const data = { ...req.body, item_img: file };

  try {
    const result = await createItemWithDetail(data);
    console.log("DEBUG: createItemWithDetail result =", result);

    // ✅ ส่ง response กลับทันที ป้องกัน 500 จากขั้นตอน emit
    res.status(201).json({
      success: true,
      item_id: result?.item_id ?? null,
      code: result?.detail_code ?? null,
    });

    // emit แยก ไม่ให้กระทบ response
    try {
      const io = getIO();
      const allItems = await require('../models/inventoryModel').getAllItemsDetailed();
      io.emit('itemsData', allItems);
    } catch (emitErr) {
      console.error("Emit error:", emitErr.message);
    }
  } catch (err) {
    console.error("Add item error:", err);
    deleteUploadedFile(file);
    res.status(500).json({ error: 'เพิ่มรายการไม่สำเร็จ', detail: err.message });
  }
};