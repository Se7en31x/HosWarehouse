const inventoryModel = require('../models/inventoryModel');
const { getIO } = require('../socketIO'); // ✅ ใช้ getIO แทนส่ง io ผ่าน param

// -------------------------
// ดึงข้อมูลทั้งหมดผ่าน WS
// -------------------------
exports.getItemsWS = async (socket) => {
  try {
    const items = await inventoryModel.getAllItemsDetailed();
    console.log('🟢 ส่งข้อมูล inventory กลับ:', items.length, 'รายการ');

    // ส่งกลับให้ client ที่ร้องขอ
    socket.emit('itemsData', items);

    // และ broadcast ให้ทุก client รู้ว่า inventory update
    const io = getIO();
    io.emit('inventory:update', items);
  } catch (err) {
    console.error('❌ ดึงข้อมูลล้มเหลว (WS):', err);
    socket.emit('itemsError', 'เกิดข้อผิดพลาดขณะดึงข้อมูล');
  }
};

// -------------------------
// REST API: ดึงข้อมูลทีละชิ้น
// -------------------------
exports.getItemById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'กรุณาระบุ id' });
    }

    const item = await inventoryModel.getItemById(id);

    if (!item) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลพัสดุ' });
    }

    res.status(200).json(item);
  } catch (error) {
    console.error('❌ Error fetching item by id:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดใน server' });
  }
};

// -------------------------
// REST API: แจ้งของชำรุด
// -------------------------
exports.reportDamaged = async (req, res) => {
  try {
    const { lot_id, item_id, qty, note } = req.body;

    if (!lot_id || !item_id || !qty) {
      return res.status(400).json({ message: 'กรุณาระบุ lot_id, item_id และ qty' });
    }

    const result = await inventoryModel.reportDamaged({ lot_id, item_id, qty, note });

    // แจ้ง broadcast inventory ใหม่ผ่าน WS ด้วย
    const io = getIO();
    const updatedItems = await inventoryModel.getAllItemsDetailed();
    io.emit('inventory:update', updatedItems);

    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Error report damaged:', error);
    res.status(400).json({ message: error.message || 'บันทึกของชำรุดล้มเหลว' });
  }
};
