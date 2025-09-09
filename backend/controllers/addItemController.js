const { createItemWithDetail } = require('../models/addItemModel');
const { getIO } = require('../socket');
const supabase = require('../supabase'); // 👉 ใช้ client จากไฟล์ supabase.js

exports.addNewItem = async (req, res) => {
  try {
    const file = req.file; // multer memoryStorage
    const userId = req.user?.id;

    let imageUrl = null;
    let originalName = null;

    if (file) {
      originalName = Buffer.from(file.originalname, 'latin1').toString('utf8'); // กันชื่อไทยเพี้ยน
      const ext = file.originalname.split('.').pop();
      const safeName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;

      // ✅ จัดโฟลเดอร์เก็บรูปไว้ที่ items/
      const filePath = `items/${safeName}`;

      // อัปโหลดไป Supabase
      const { error: uploadError } = await supabase.storage
        .from('hospital-files') // ใช้ bucket เดิม
        .upload(filePath, file.buffer, { contentType: file.mimetype });

      if (uploadError) throw uploadError;

      // ✅ สร้าง Public URL
      imageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/hospital-files/${filePath}`;
    }

    // ✅ ส่งข้อมูลต่อไปยัง model
    const data = {
      ...req.body,
      item_img: imageUrl,          // เก็บ URL ของไฟล์
      original_name: originalName, // เก็บชื่อไฟล์จริง
      created_by: userId || null,
    };

    const result = await createItemWithDetail(data);

    res.status(201).json({
      success: true,
      item_id: result?.item_id ?? null,
      code: result?.detail_code ?? null,
      imageUrl,
      originalName,
    });

    // 🔄 broadcast update
    try {
      const io = getIO();
      const allItems = await require('../models/inventoryModel').getAllItemsDetailed();
      io.emit('itemsUpdated', allItems);
    } catch (emitErr) {
      console.error('Emit error:', emitErr.message);
    }
  } catch (err) {
    console.error('Add item error:', err);
    res.status(500).json({ error: 'เพิ่มรายการไม่สำเร็จ', detail: err.message });
  }
};
