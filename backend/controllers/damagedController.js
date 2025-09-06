const DamagedModel = require('../models/damagedModel');
const InventoryModel = require('../models/inventoryModel'); 
const { getIO } = require('../socket'); 

// ✅ ดึงรายการพัสดุชำรุดทั้งหมด
exports.getDamagedItems = async (req, res) => {
  try {
    const items = await DamagedModel.getAll();
    res.json(items);
  } catch (err) {
    console.error('getDamagedItems error:', err);
    res.status(500).json({ error: 'Error fetching damaged items' });
  }
};

// ✅ บันทึกการดำเนินการ (ซ่อม / ทำลาย)
exports.addDamagedAction = async (req, res) => {
  try {
    const { damaged_id } = req.params;
    const { action_type, action_qty, note } = req.body;
    const action_by = req.user?.id; // ใช้ user จาก token เท่านั้น

    if (!action_by) {
      return res.status(401).json({ error: 'Unauthorized: user not found in token' });
    }
    if (!['repaired', 'disposed'].includes(action_type)) {
      return res.status(400).json({ error: 'Invalid action type' });
    }

    // ✅ แก้ไข: ไม่ต้องเรียก DamagedModel.getDamagedItemById() แล้ว
    // ให้ DamagedModel.addAction() เป็นผู้รับผิดชอบในการดึงข้อมูลเอง
    await DamagedModel.addAction({
      damaged_id,
      action_type,
      action_qty,
      action_by,
      note,
    });

    // อัปเดตหน้า damaged
    const io = getIO();
    const updatedDamagedItems = await DamagedModel.getAll();
    io.emit('damagedUpdated', updatedDamagedItems);
    
    // อัปเดตหน้า inventory
    const updatedInventory = await InventoryModel.getAllItemsDetailed();
    io.emit('itemsData', updatedInventory);

    res.json({ message: 'Action recorded successfully' });
  } catch (err) {
    console.error('addDamagedAction error:', err);
    res.status(500).json({ error: 'Failed to update damaged item' });
  }
};

// ✅ ดึงประวัติการดำเนินการของ damaged_id
exports.getDamagedActions = async (req, res) => {
  try {
    const { damaged_id } = req.params;
    const data = await DamagedModel.getActionsByDamagedId(damaged_id);
    res.json(data);
  } catch (err) {
    console.error('getDamagedActions error:', err);
    res.status(500).json({ error: 'Failed to fetch actions history' });
  }
};

// ✅ รายงานพัสดุชำรุดใหม่
exports.reportDamaged = async (req, res) => {
  try {
    const {
      item_id,
      lot_id,
      damaged_qty,
      damage_type,
      damaged_note,
      source_type,
      source_ref_id
    } = req.body;

    // ✅ แก้ไข: ดึง user id จาก req.user?.id ให้ถูกต้อง
    const reported_by = req.user?.id;
    if (!reported_by) {
      return res.status(401).json({ error: 'Unauthorized: user not found in token' });
    }

    const data = await DamagedModel.insert({
      item_id,
      lot_id,
      damaged_qty,
      damage_type,
      damaged_note,
      source_type: source_type || 'manual', // กัน null
      source_ref_id,
      reported_by
    });

    // อัปเดตหน้า damaged
    const io = getIO();
    const updatedDamagedItems = await DamagedModel.getAll();
    io.emit('damagedUpdated', updatedDamagedItems);
    
    // อัปเดตหน้า inventory
    const updatedInventory = await InventoryModel.getAllItemsDetailed();
    io.emit('itemsData', updatedInventory);

    res.status(201).json({
      message: 'Damaged item recorded successfully',
      data
    });
  } catch (err) {
    console.error('reportDamaged error:', err);
    res.status(500).json({ error: 'Failed to report damaged item' });
  }
};
