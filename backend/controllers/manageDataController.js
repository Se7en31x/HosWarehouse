const manageDataModel = require('../models/managedataModel');
const { getIO } = require('../socket');
const inventoryModel = require('../models/inventoryModel');
const { pool } = require('../config/db');

exports.getManageData = async (req, res) => {
  try {
    const data = await manageDataModel.getAllItemsDetailed();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล', details: error.message });
  }
};

exports.deleteItem = async (req, res) => {
  const { id } = req.params;

  try {
    const query = `UPDATE items SET is_deleted = true, updated_at = CURRENT_TIMESTAMP WHERE item_id = $1`;
    await pool.query(query, [id]);

    const io = getIO();
    const updatedItems = await inventoryModel.getAllItemsDetailed();
    // ✅ เปลี่ยนชื่อ Event จาก 'itemsData' เป็น 'itemsUpdated' ให้ตรงกับ Front-end
    io.emit('itemsUpdated', updatedItems);

    res.status(200).json({ success: true, message: 'ลบข้อมูลเรียบร้อย (soft delete)' });
  } catch (error) {
    console.error('❌ ลบข้อมูลล้มเหลว:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบข้อมูล', error: error.message });
  }
};

exports.getItemById = async (req, res) => {
  const { id } = req.params;
  try {
    const item = await manageDataModel.getItemById(id);

    if (!item) {
      return res.status(404).json({ error: 'ไม่พบรายการนี้' });
    }
    console.log('ข้อมูลที่ดึงมาได้:', item);
    res.status(200).json(item);
  } catch (error) {
    console.error('❌ getItemById error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด', details: error.message });
  }
};

exports.updateItem = async (req, res) => {
  console.log('req.body:', req.body);
  console.log('req.file:', req.file);
  const { id } = req.params;
  const category = req.body.item_category;

  try {
    await manageDataModel.updateBaseItem(id, req.body, req.file);
    switch (category) {
      case 'medicine':
        await manageDataModel.updateMedicine(id, req.body);
        break;
      case 'equipment':
        await manageDataModel.updateEquipment(id, req.body);
        break;
      case 'general':
        await manageDataModel.updateGeneral(id, req.body);
        break;
      case 'medsup':
        await manageDataModel.updateMedsup(id, req.body);
        break;
      case 'meddevice':
        await manageDataModel.updateMedDevice(id, req.body);
        break;
      default:
        return res.status(400).json({ error: 'ไม่รู้จักประเภทพัสดุ' });
    }

    const io = getIO();
    const updatedItems = await inventoryModel.getAllItemsDetailed();
    // ✅ เปลี่ยนชื่อ Event จาก 'itemsData' เป็น 'itemsUpdated' ให้ตรงกับ Front-end
    io.emit('itemsUpdated', updatedItems);

    res.status(200).json({ message: 'อัปเดตข้อมูลสำเร็จ' });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดขณะอัปเดตข้อมูล' });
  }
};
