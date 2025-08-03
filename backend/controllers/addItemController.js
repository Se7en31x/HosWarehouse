const fs = require('fs');
const path = require('path');
const addItemModel = require('../models/addItemModel');
const { pool } = require('../config/db');
const { getIO } = require('../socket');

// Helper functions (ย้ายไปไว้ที่ utils/helpers.js จะดีกว่า แต่ตอนนี้แก้ไขที่นี่ไปก่อน)
const parseNullable = (value) => value?.trim() === '' ? null : value;
const parseNullableDate = (value) => value?.trim() === '' ? null : value;
const parseNullableInt = (value) => {
    const n = parseInt(value);
    return isNaN(n) ? 0 : n;
};
const parseNullableFloat = (value) => {
    const f = parseFloat(value);
    return isNaN(f) ? 0 : f;
};

function deleteUploadedFile(filePath) {
    if (filePath && fs.existsSync(path.join('uploads', filePath))) {
        fs.unlinkSync(path.join('uploads', filePath));
        console.log('🗑️ ลบรูปภาพ:', filePath);
    }
}

exports.addNewItem = async (req, res) => {
    const file = req.file ? req.file.filename : null;
    try {
        console.log('BODY:', req.body);
        console.log('FILE:', req.file);

        // สร้าง Object ข้อมูลใหม่เพื่อป้องกันการเปลี่ยนแปลงข้อมูลต้นฉบับ
        // และจัดการค่าให้พร้อมใช้งาน
        const data = {
            item_name: parseNullable(req.body.item_name),
            item_category: parseNullable(req.body.item_category),
            item_sub_category: parseNullable(req.body.item_sub_category),
            item_unit: parseNullable(req.body.item_unit),
            item_location: parseNullable(req.body.item_location),
            item_zone: parseNullable(req.body.item_zone),
            item_exp: parseNullableDate(req.body.item_exp),
            item_barcode: parseNullable(req.body.item_barcode),
            item_img: file, // ใช้ชื่อตัวแปรให้ตรงกัน
            
            // ค่าตัวเลข
            item_qty: parseNullableInt(req.body.item_qty),
            item_min: parseNullableInt(req.body.item_min),
            item_max: parseNullableInt(req.body.item_max),

            // ข้อมูล medicine
            med_generic_name: parseNullable(req.body.med_generic_name),
            med_thai_name: parseNullable(req.body.med_thai_name),
            med_marketing_name: parseNullable(req.body.med_marketing_name),
            med_counting_unit: parseNullable(req.body.med_counting_unit),
            med_dosage_form: parseNullable(req.body.med_dosage_form),
            med_medical_category: parseNullable(req.body.med_medical_category),
            med_cost_price: parseNullableFloat(req.body.med_cost_price),
            med_selling_price: parseNullableFloat(req.body.med_selling_price),
            med_medium_price: parseNullableFloat(req.body.med_medium_price),
            med_TMT_code: parseNullable(req.body.med_TMT_code),
            med_TPU_code: parseNullable(req.body.med_TPU_code),
            med_TMT_GP_name: parseNullable(req.body.med_TMT_GP_name),
            med_TMT_TP_name: parseNullable(req.body.med_TMT_TP_name),
            med_severity: parseNullable(req.body.med_severity),
            med_essential_med_list: parseNullable(req.body.med_essential_med_list),
            med_pregnancy_cagetory: parseNullable(req.body.med_pregnancy_cagetory),
            med_mfg: parseNullableDate(req.body.med_mfg),
            med_exp: parseNullableDate(req.body.med_exp),
            med_dose_dialogue: parseNullable(req.body.med_dose_dialogue),
            med_replacement: parseNullable(req.body.med_replacement),

            // ข้อมูล medsup
            medsup_category: parseNullable(req.body.medsup_category),
            medsup_brand: parseNullable(req.body.medsup_brand),
            medsup_serial_no: parseNullable(req.body.medsup_serial_no),
            medsup_status: parseNullable(req.body.medsup_status),
            medsup_price: parseNullableFloat(req.body.medsup_price),
            
            // ... (ทำแบบเดียวกันกับ equip, meddevice, general)
        };

        const baseResult = await addItemModel.addBaseItem(data);
        if (!baseResult) {
            deleteUploadedFile(data.item_img);
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
                deleteUploadedFile(data.item_img);
                return res.status(400).json({ error: 'ไม่รู้จักประเภทพัสดุ' });
        }

        if (!detailResult.success) {
            deleteUploadedFile(data.item_img);
            return res.status(400).json({ error: 'เพิ่มข้อมูลเสริมไม่สำเร็จ' });
        }

        const io = getIO();
        const allItems = await require('../models/inventoryModel').getAllItemsDetailed();
        io.emit('itemsData', allItems);
        
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