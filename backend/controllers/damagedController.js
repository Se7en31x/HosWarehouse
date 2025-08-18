const DamagedModel = require('../models/damagedModel');
const InventoryModel = require('../models/inventoryModel'); // ✅ เพิ่ม import
const { getIO } = require('../socket'); 

exports.getDamagedItems = async (req, res) => {
  try {
    const items = await DamagedModel.getAll();
    res.json(items);
  } catch (err) {
    console.error('getDamagedItems error:', err);
    res.status(500).json({ error: 'Error fetching damaged items' });
  }
};

exports.addDamagedAction = async (req, res) => {
  try {
    const { damaged_id } = req.params;
    const { action_type, action_qty, note } = req.body;
    const action_by = req.user?.user_id || 1; // mock หรือเอาจาก JWT

    if (!['repaired', 'disposed'].includes(action_type)) {
      return res.status(400).json({ error: 'Invalid action type' });
    }

    await DamagedModel.addAction({
      damaged_id,
      action_type,
      action_qty,
      action_by,
      note
    });

    // ✅ เพิ่มการส่งข้อมูลผ่าน WebSocket เพื่ออัปเดตหน้า Damaged Items
    const io = getIO();
    const updatedDamagedItems = await DamagedModel.getAll();
    io.emit('damagedUpdated', updatedDamagedItems);
    
    // ✅ เพิ่มการส่งข้อมูล WebSocket เพื่ออัปเดตหน้า Inventory
    const updatedInventory = await InventoryModel.getAllItemsDetailed();
    io.emit('itemsData', updatedInventory);

    res.json({ message: 'Action recorded successfully' });
  } catch (err) {
    console.error('addDamagedAction error:', err);
    res.status(500).json({ error: 'Failed to update damaged item' });
  }
};

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

    const reported_by = req.user?.user_id || 1; // mock หรือเอาจาก JWT

    const data = await DamagedModel.insert({
      item_id,
      lot_id,
      damaged_qty,
      damage_type,
      damaged_note,
      source_type: source_type || 'manual',  // ✅ กัน null
      source_ref_id,
      reported_by
    });

    // ✅ emit event อัปเดต list รายการชำรุด
    const io = getIO();
    const updatedDamagedItems = await DamagedModel.getAll();
    io.emit('damagedUpdated', updatedDamagedItems);
    
    // ✅ เพิ่มการส่งข้อมูล WebSocket เพื่ออัปเดตหน้า Inventory
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
