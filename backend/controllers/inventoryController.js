const inventoryModel = require('../models/inventoryModel');
const { getIO } = require('../socket');
const damagedModel = require('../models/damagedModel');

// --------------------------- REST API --------------------------- //

// GET /inventory/all - สำหรับผู้ดูแลคลัง (ใช้สำหรับหน้า Overview)
exports.getAllItems = async (req, res) => {
    try {
        const items = await inventoryModel.getAllItemsDetailed();
        res.status(200).json(items);

        const io = getIO();
        if (io) {
            // ส่งข้อมูลละเอียดทั้งหมดให้กับผู้ที่ subscribe หน้ารายละเอียด
            io.emit('itemsData', items);
        }
    } catch (error) {
        console.error('❌ Error getAllItems:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
};

// GET /inventory/for-withdrawal - API ใหม่สำหรับพนักงานทั่วไป
exports.getAllItemsForWithdrawal = async (req, res) => {
    try {
        // ✅ เรียกใช้ Model ที่ optimized สำหรับหน้าเบิก-ยืม
        const items = await inventoryModel.getAllItemsForWithdrawal();
        res.status(200).json(items);

        const io = getIO();
        if (io) {
            // ✅ เพิ่มการส่งข้อมูลแบบ Real-time สำหรับหน้าเบิก-ยืม
            // ใช้ event ที่เจาะจงเพื่อไม่ให้ข้อมูลไปปนกับหน้าของผู้ดูแล
            io.emit("itemsDataForWithdrawal", items);
        }

    } catch (error) {
        console.error('❌ Error getAllItemsForWithdrawal:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสำหรับหน้าเบิก-ยืม' });
    }
};

// GET /inventory/:id - ใช้สำหรับหน้ารายละเอียดสินค้า
exports.getItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const itemId = parseInt(id, 10);

    if (isNaN(itemId)) {
      return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    }

    const item = await inventoryModel.getItemById(itemId);
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

        await inventoryModel.reportDamaged({ lot_id, item_id, qty, note, reported_by, damaged_type });

        const io = getIO();
        if (io) {
            // อัปเดตหน้ารวม damaged (สำหรับผู้ดูแล)
            const updatedDamagedItems = await damagedModel.getAll();
            io.emit('damagedUpdated', updatedDamagedItems);

            // ส่งสัญญาณเฉพาะ item ที่เพิ่งถูกตัด (สำหรับหน้าเบิก-ยืมของพนักงาน)
            const updatedItemsForStaff = await inventoryModel.getAllItemsForWithdrawal();
            io.emit("itemsDataForWithdrawal", updatedItemsForStaff); 

            // ส่งสัญญาณ item ที่เพิ่งถูกตัดแบบละเอียด (สำหรับหน้ารายละเอียด)
            const updatedItemDetailed = await inventoryModel.getItemById(item_id);
            if (updatedItemDetailed) {
                io.emit("itemUpdated", {
                    item_id: updatedItemDetailed.item_id,
                    item_name: updatedItemDetailed.item_name,
                    item_unit: updatedItemDetailed.item_unit,
                    item_img: updatedItemDetailed.item_img,
                    current_stock: updatedItemDetailed.total_on_hand_qty,
                    deducted: qty
                });
            }
        }

        res.status(201).json({ message: 'บันทึกของชำรุดเรียบร้อยแล้ว' });
    } catch (error) {
        console.error('❌ Error reporting damaged item:', error);
        res.status(500).json({ message: error.message || 'ไม่สามารถบันทึกรายการชำรุดได้' });
    }
};