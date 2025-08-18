const inventoryModel = require('../models/inventoryModel');
const { getIO } = require('../socket');
const damagedModel = require('../models/damagedModel'); // ✅ Import the damagedModel

// --------------------------- REST API --------------------------- //

// GET /inventory/all
exports.getAllItems = async (req, res) => {
  try {
    const items = await inventoryModel.getAllItemsDetailed();
    res.status(200).json(items);

    // broadcast ผ่าน WebSocket ด้วย (option)
    const io = getIO();
    if (io) {
      io.emit('itemsData', items);
    }
  } catch (error) {
    console.error('❌ Error getAllItems:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
  }
};

// GET /inventoryCheck/:id
exports.getItemById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'กรุณาระบุ id' });
    }

    if (id === "all") {
      // ถ้าเป็น all → ดึงทั้งหมดแทน
      const items = await inventoryModel.getAllItemsDetailed();
      return res.json(items);
    }

    const item = await inventoryModel.getItemById(parseInt(id, 10));
    if (!item) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลพัสดุ' });
    }

    res.json(item);
  } catch (error) {
    console.error('❌ Error getItemById:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดใน server' });
  }
};

// ----------------------------------------------------------------------
// POST /api/damaged
// ----------------------------------------------------------------------
exports.reportDamaged = async (req, res) => {
  try {
    const { lot_id, item_id, qty, note, damaged_type } = req.body;
    const reported_by = req.user?.user_id || 1; // MOCK

    // ✅ ตรวจสอบข้อมูลที่ได้รับจาก client ก่อนส่งไปยัง model
    // เพิ่มการตรวจสอบว่า lot_id และ item_id ไม่เป็นค่าว่าง
    if (!lot_id || !item_id || !qty || qty <= 0 || !damaged_type) {
      return res.status(400).json({ message: 'ข้อมูลที่ส่งมาไม่ครบถ้วนหรือไม่ถูกต้อง' });
    }

    // ✅ เรียกใช้ฟังก์ชัน reportDamaged จาก inventoryModel.js
    await inventoryModel.reportDamaged({ lot_id, item_id, qty, note, reported_by, damaged_type });

    // ✅ ส่งสัญญาณ WebSocket เพื่ออัปเดตข้อมูล
    const io = getIO();
    if (io) {
      const updatedDamagedItems = await damagedModel.getAll();
      io.emit('damagedUpdated', updatedDamagedItems);
      
      const updatedInventory = await inventoryModel.getAllItemsDetailed();
      io.emit('itemsData', updatedInventory);
    }

    res.status(201).json({ message: 'บันทึกของชำรุดเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('❌ Error reporting damaged item:', error);
    res.status(500).json({ message: error.message || 'ไม่สามารถบันทึกรายการชำรุดได้' });
  }
};

// --------------------------- WebSocket --------------------------- //
// เดิมที่เป็น socket-only -> ให้เรียกใช้ model เหมือนกัน
exports.getItemsWS = async (socket) => {
  try {
    const items = await inventoryModel.getAllItemsDetailed();
    console.log('🟢 ส่งข้อมูล inventory ผ่าน WS:', items.length, 'รายการ');
    socket.emit('itemsData', items); // ตอบกลับเฉพาะ client ที่ขอ
  } catch (err) {
    console.error('❌ ดึงข้อมูลล้มเหลว (WS):', err);
    socket.emit('itemsError', 'เกิดข้อผิดพลาดขณะดึงข้อมูล');
  }
};
