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
  const userId = req.user?.user_id; // ✅ จาก token
  const data = { 
    ...req.body, 
    item_img: file,
    created_by: userId || null 
  };

  try {
    const result = await createItemWithDetail(data);
    console.log("DEBUG: createItemWithDetail result =", result);

    res.status(201).json({
      success: true,
      item_id: result?.item_id ?? null,
      code: result?.detail_code ?? null,
    });

    try {
      const io = getIO();
      const allItems = await require('../models/inventoryModel').getAllItemsDetailed();
      io.emit('itemsUpdated', allItems); // 🔄 ใช้ชื่อ event เดียวกันกับ ManageDataPage
    } catch (emitErr) {
      console.error("Emit error:", emitErr.message);
    }
  } catch (err) {
    console.error("Add item error:", err);
    deleteUploadedFile(file);
    res.status(500).json({ error: 'เพิ่มรายการไม่สำเร็จ', detail: err.message });
  }
};
