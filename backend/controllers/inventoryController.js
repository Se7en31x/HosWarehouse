const inventoryModel = require('../models/inventoryModel');
const damagedModel = require('../models/damagedModel');
const rolePermissions = require('../config/rolePermissions'); // 👈 import permissions

// --------------------------- REST API --------------------------- //

// GET /inventory/all - สำหรับผู้ดูแลคลัง (ใช้สำหรับหน้า Overview)
exports.getAllItems = async (req, res) => {
    try {
        const items = await inventoryModel.getAllItemsDetailed();
        res.status(200).json(items);
    } catch (error) {
        console.error('❌ Error getAllItems:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
};

// GET /inventory/for-withdrawal - สำหรับพนักงานทั่วไป
exports.getAllItemsForWithdrawal = async (req, res) => {
    try {
        const role = req.user?.role; // 👈 ได้มาจาก JWT
        const allowed = rolePermissions[role] || [];

        const items = await inventoryModel.getAllItemsForWithdrawal();

        // ✅ กรองให้เหลือเฉพาะ category ที่ role มีสิทธิ์
        const filteredItems = items.filter(item =>
            allowed.includes('*') || allowed.includes(item.item_category)
        );

        res.status(200).json(filteredItems);
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
        const reported_by = req.user?.id; // ✅ ใช้ id จาก JWT โดยตรง

        if (!lot_id || !item_id || !qty || qty <= 0 || !damage_type) {
            return res.status(400).json({ message: 'ข้อมูลที่ส่งมาไม่ครบถ้วนหรือไม่ถูกต้อง' });
        }

        await inventoryModel.reportDamaged({
            lot_id,
            item_id,
            qty,
            note,
            reported_by,
            damage_type,
            source_type: source_type || "manual",
            source_ref_id: source_ref_id || null
        });
        res.status(201).json({ message: 'บันทึกของชำรุดเรียบร้อยแล้ว' });
    } catch (error) {
        console.error('❌ Error reporting damaged item:', error);
        res.status(500).json({ message: error.message || 'ไม่สามารถบันทึกรายการชำรุดได้' });
    }
};

exports.adjustInventory = async (req, res) => {
    try {
        const { lot_id, item_id, actual_qty, reason } = req.body;
        const reported_by = req.user?.id; // ✅

        if (!lot_id || !item_id || actual_qty === undefined || !reason) {
            return res.status(400).json({ message: 'ข้อมูลไม่ครบถ้วน' });
        }

        const itemLots = await inventoryModel.getItemById(item_id);
        const currentLot = itemLots.lots.find(lot => lot.lot_id === lot_id);

        if (!currentLot) {
            return res.status(404).json({ message: 'ไม่พบ Lot ที่ต้องการปรับปรุง' });
        }

        const previous_qty = currentLot.remaining_qty;
        const difference = actual_qty - previous_qty;

        await inventoryModel.adjustInventory({
            lot_id,
            item_id,
            actual_qty,
            reason,
            difference,
            reported_by
        });
        res.status(200).json({ message: 'ปรับปรุงจำนวนสต็อกเรียบร้อยแล้ว' });

    } catch (error) {
        console.error('❌ Error in adjustInventory controller:', error);
        res.status(500).json({ message: error.message || 'เกิดข้อผิดพลาดในการปรับปรุงจำนวนสต็อก' });
    }
};
