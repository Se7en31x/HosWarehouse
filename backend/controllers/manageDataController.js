const manageDataModel = require('../models/managedataModel');
const { getIO } = require('../socket');
const inventoryModel = require('../models/inventoryModel');
const supabase = require('../supabase');

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
    res.status(200).json(item);
  } catch (error) {
    console.error('❌ getItemById error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด', details: error.message });
  }
};

exports.updateItem = async (req, res) => {
  const { id } = req.params;
  const category = req.body.item_category;

  try {
    // ✅ handle image upload
    if (req.file) {
      const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      const ext = req.file.originalname.split('.').pop();
      const safeName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;
      const filePath = `items/${safeName}`;

      // upload to supabase
      const { error: uploadError } = await supabase.storage
        .from('hospital-files')
        .upload(filePath, req.file.buffer, { contentType: req.file.mimetype });

      if (uploadError) throw uploadError;

      const imageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/hospital-files/${filePath}`;

      req.body.item_img = imageUrl;
      req.body.original_name = originalName;
    }

    // ✅ update base item
    await manageDataModel.updateBaseItem(id, req.body);

    // ✅ update detail by category
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
    io.emit('itemsUpdated', updatedItems);

    res.status(200).json({ message: 'อัปเดตข้อมูลสำเร็จ' });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดขณะอัปเดตข้อมูล', details: err.message });
  }
};
