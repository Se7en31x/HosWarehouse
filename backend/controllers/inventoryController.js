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
            io.emit('itemsData', items); // ✅ broadcast สำหรับ admin
        }
    } catch (error) {
        console.error('❌ Error getAllItems:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
};

// GET /inventory/for-withdrawal - สำหรับพนักงานทั่วไป
exports.getAllItemsForWithdrawal = async (req, res) => {
    try {
        const items = await inventoryModel.getAllItemsForWithdrawal();
        res.status(200).json(items);

        const io = getIO();
        if (io) {
            io.emit("itemsDataForWithdrawal", items); // ✅ broadcast แยก channel
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
        const { lot_id, item_id, qty, note, damage_type, source_type, source_ref_id } = req.body;
        const reported_by = req.user?.user_id || 1; // MOCK (รอ Auth จริง)

        if (!lot_id || !item_id || !qty || qty <= 0 || !damage_type) {
            return res.status(400).json({ message: 'ข้อมูลที่ส่งมาไม่ครบถ้วนหรือไม่ถูกต้อง' });
        }

        // ✅ เรียก model
        await inventoryModel.reportDamaged({
            lot_id,
            item_id,
            qty,
            note,
            reported_by,
            damage_type,                 // ใช้ชื่อนี้ตรงกับ DB
            source_type: source_type || "manual",
            source_ref_id: source_ref_id || null
        });

        const io = getIO();
        if (io) {
            // อัปเดต damaged (admin)
            const updatedDamagedItems = await damagedModel.getAll();
            io.emit('damagedUpdated', updatedDamagedItems);

            // อัปเดต stock (staff)
            const updatedItemsForStaff = await inventoryModel.getAllItemsForWithdrawal();
            io.emit("itemsDataForWithdrawal", updatedItemsForStaff);

            // อัปเดตรายการเดี่ยว (detail page)
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

exports.adjustInventory = async (req, res) => {
    try {
        const { lot_id, item_id, actual_qty, reason } = req.body;
        const reported_by = req.user?.user_id || 1; // MOCK (ใช้ user ที่เข้าสู่ระบบจริงในอนาคต)

        // ตรวจสอบข้อมูลที่จำเป็น
        if (!lot_id || !item_id || actual_qty === undefined || !reason) {
            return res.status(400).json({ message: 'ข้อมูลไม่ครบถ้วน: lot_id, item_id, actual_qty, และ reason เป็นค่าที่ต้องระบุ' });
        }

        // 1. ดึงจำนวนคงเหลือปัจจุบันเพื่อคำนวณส่วนต่าง (difference)
        const itemLots = await inventoryModel.getItemById(item_id);
        const currentLot = itemLots.lots.find(lot => lot.lot_id === lot_id);

        if (!currentLot) {
            return res.status(404).json({ message: 'ไม่พบ Lot ที่ต้องการปรับปรุง' });
        }

        const previous_qty = currentLot.remaining_qty;
        const difference = actual_qty - previous_qty;

        // 2. เรียกใช้ฟังก์ชันใน Model เพื่อทำ Transaction (Update + Insert)
        const result = await inventoryModel.adjustInventory({
            lot_id,
            item_id,
            actual_qty,
            reason,
            difference,
            reported_by
        });

        // 3. ส่งข้อมูลล่าสุดกลับไปอัปเดตหน้า UI ผ่าน WebSocket (ถ้ามี)
        const io = getIO();
        if (io) {
            // อัปเดตข้อมูลสำหรับหน้า Overview (Admin)
            const updatedItems = await inventoryModel.getAllItemsDetailed();
            io.emit('itemsData', updatedItems);

            // อัปเดตข้อมูลสำหรับหน้าเบิก-ยืม (Staff)
            const updatedItemsForStaff = await inventoryModel.getAllItemsForWithdrawal();
            io.emit("itemsDataForWithdrawal", updatedItemsForStaff);

            // อัปเดตข้อมูลสำหรับหน้ารายละเอียดสินค้า (Detail Page)
            const updatedItemDetailed = await inventoryModel.getItemById(item_id);
            io.emit("itemUpdated", updatedItemDetailed);
        }

        res.status(200).json({ message: 'ปรับปรุงจำนวนสต็อกเรียบร้อยแล้ว' });

    } catch (error) {
        console.error('❌ Error in adjustInventory controller:', error);
        res.status(500).json({ message: error.message || 'เกิดข้อผิดพลาดในการปรับปรุงจำนวนสต็อก' });
    }
};