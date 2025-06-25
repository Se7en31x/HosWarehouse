const fs = require('fs');
const path = require('path');
const addItemModel = require('../models/addItemModel');
const { pool } = require('../config/db');
const { getIO } = require('../socket');

function parseNullable(value) {
    return value?.trim() === '' ? null : value;
}

function parseNullableDate(value) {
    return value?.trim() === '' ? null : value;
}

function parseNullableInt(value) {
    const n = parseInt(value);
    return isNaN(n) ? 0 : n;
}

function parseNullableFloat(value) {
    const f = parseFloat(value);
    return isNaN(f) ? 0 : f;
}

function deleteUploadedFile(filePath) {
    if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('🗑️ ลบรูปภาพ:', filePath);
    }
}

exports.addNewItem = async (req, res) => {
    const file = req.file ? req.file.filename : null; // ✅ เก็บแค่ชื่อไฟล์
    try {
        console.log('BODY:', req.body);
        console.log('FILE:', req.file);

        const data = req.body;

        if (file) {
            data.item_image = file;
        }

        // แปลงค่าว่างเป็น null สำหรับวันที่
        data.item_expire_date = parseNullableDate(data.item_expire_date);
        data.item_order_date = parseNullableDate(data.item_order_date);

        // แปลงค่าที่ควรเป็นตัวเลข
        data.item_qty = parseNullableInt(data.item_quantity);
        data.item_min = parseNullableInt(data.item_min);
        data.item_max = parseNullableInt(data.item_max);
        if (data.medsup_qty) data.medsup_qty = parseNullableInt(data.medsup_qty);
        if (data.medsup_price) data.medsup_price = parseNullableFloat(data.medsup_price);

        // วันที่ของแต่ละประเภท
        data.med_exp = parseNullableDate(data.med_exp);
        data.medsup_expiry_date = parseNullableDate(data.medsup_expiry_date);
        data.equip_purchase_date = parseNullableDate(data.equip_purchase_date);
        data.equip_warranty_expire = parseNullableDate(data.equip_warranty_expire);
        data.equip_last_maintenance = parseNullableDate(data.equip_last_maintenance);

        const baseResult = await addItemModel.addBaseItem(data);
        if (!baseResult) {
            deleteUploadedFile(file);
            return res.status(400).json({ error: 'ไม่สามารถเพิ่มข้อมูลพื้นฐานได้' });
        }

        const item_id = baseResult.item_id;
        const category = data.item_category;
        let detailResult;

        switch (category) {
            case 'medicine':
                detailResult = await addItemModel.insertMedicine(item_id, data);
                break;
            case 'medsup':
                detailResult = await addItemModel.insertMedsup(item_id, data);
                break;
            case 'equipment':
                detailResult = await addItemModel.insertEquipment(item_id, data);
                break;
            case 'meddevice':
                detailResult = await addItemModel.insertMedDevice(item_id, data);
                break;
            case 'general':
                detailResult = await addItemModel.insertGeneral(item_id, data);
                break;
            default:
                deleteUploadedFile(file);
                return res.status(400).json({ error: 'ไม่รู้จักประเภทพัสดุ' });
        }

        if (!detailResult.success) {
            deleteUploadedFile(file);
            return res.status(400).json({ error: 'เพิ่มข้อมูลเสริมไม่สำเร็จ' });
        }
        // ✅ หลังเพิ่มสำเร็จ ดึงข้อมูล inventory ใหม่ และส่งผ่าน socket
        const io = getIO(); // ✅
        const allItems = await require('../models/inventoryModel').getAllItemsDetailed(); // ✅
        io.emit('itemsData', allItems); // ✅ ส่งข้อมูล inventory ไปยังทุก client
        
        return res.status(201).json({
            success: true,
            item_id,
            message: 'เพิ่มข้อมูลสำเร็จ'
        });

    } catch (error) {
        deleteUploadedFile(file);
        console.error('❌ ERROR:', error);
        res.status(500).json({
            error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
            details: error.message
        });
    }
};
