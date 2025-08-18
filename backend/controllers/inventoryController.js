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

    if (!lot_id || !item_id || !qty || qty <= 0 || !damaged_type) {
      return res.status(400).json({ message: 'ข้อมูลที่ส่งมาไม่ครบถ้วนหรือไม่ถูกต้อง' });
    }

    // ✅ บันทึกการชำรุด + ตัดสต็อก
    await inventoryModel.reportDamaged({ lot_id, item_id, qty, note, reported_by, damaged_type });

    const io = getIO();
    if (io) {
      // 🔹 อัปเดตหน้ารวม damaged
      const updatedDamagedItems = await damagedModel.getAll();
      io.emit('damagedUpdated', updatedDamagedItems);

      // 🔹 อัปเดตหน้ารวม inventory
      const updatedInventory = await inventoryModel.getAllItemsDetailed();
      io.emit('itemsData', updatedInventory);

      // 🔹 ส่งสัญญาณเฉพาะ item ที่เพิ่งถูกตัด (เหมือน deductStock)
      const updatedItem = await inventoryModel.getItemById(item_id);
      if (updatedItem) {
        io.emit("itemUpdated", {
          item_id: updatedItem.item_id,
          item_name: updatedItem.item_name,
          item_unit: updatedItem.item_unit,
          item_img: updatedItem.item_img,    // ✅ ส่งชื่อไฟล์
          deducted: qty,                     // จำนวนที่เสียหาย
          current_stock: updatedItem.total_on_hand_qty // จำนวนคงเหลือใหม่
        });
      }
    }

    res.status(201).json({ message: 'บันทึกของชำรุดเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('❌ Error reporting damaged item:', error);
    res.status(500).json({ message: error.message || 'ไม่สามารถบันทึกรายการชำรุดได้' });
  }
};
