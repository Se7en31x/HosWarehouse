const {
    withdrawHistoryModel,
    borrowHistoryModel,
    returnHistoryModel,
    stockinHistoryModel, // ✅ แก้ไข: เปลี่ยนชื่อจาก importHistoryModel
    expiredHistoryModel,
    damagedHistoryModel,
    stockoutHistoryModel,
} = require('../models/history');

/* ---------------- Withdraw ---------------- */
exports.getWithdrawHistory = async (req, res) => {
    try {
        const data = await withdrawHistoryModel.getAll();
        res.json(data);
    } catch (err) {
        console.error("❌ Error getWithdrawHistory:", err);
        res.status(500).json({ message: "ไม่สามารถดึงประวัติการเบิกได้" });
    }
};

/* ---------------- Borrow ---------------- */
exports.getBorrowHistory = async (req, res) => {
    try {
        const data = await borrowHistoryModel.getAllBorrow();
        res.json(data);
    } catch (err) {
        console.error("❌ Error getBorrowHistory:", err);
        res.status(500).json({ message: "ไม่สามารถดึงประวัติการยืมได้" });
    }
};

/* ---------------- Stock In ---------------- */
exports.getStockinHistory = async (req, res) => { // ✅ แก้ไข: เปลี่ยนชื่อฟังก์ชัน
    try {
        const data = await stockinHistoryModel.getAllStockins(); // ✅ แก้ไข: เปลี่ยนการเรียกใช้
        res.status(200).json(data);
    } catch (err) {
        console.error('❌ Error getStockinHistory:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงประวัติการนำเข้า' });
    }
};


// /* ---------------- Return ---------------- */
// exports.getReturnHistory = async (req, res) => {
//     try {
//       const data = await returnModel.getAll();
//       res.json(data);
//     } catch (err) {
//       console.error("❌ Error getReturnHistory:", err);
//       res.status(500).json({ message: "ไม่สามารถดึงประวัติการคืนได้" });
//     }
// };

/* ---------------- Damaged ---------------- */
exports.getDamagedHistory = async (req, res) => {
    try {
        const data = await damagedHistoryModel.getAllDamaged();
        res.json(data);
    } catch (err) {
        console.error("❌ Error getDamagedHistory:", err);
        res.status(500).json({ message: "ไม่สามารถดึงประวัติการชำรุดได้" });
    }
};

// ✅ เพิ่มรายละเอียดตาม damaged_id
exports.getDamagedDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await damagedHistoryModel.getDamagedDetail(id);

        if (!data) {
            return res.status(404).json({ message: "ไม่พบข้อมูล" });
        }

        res.json(data);
    } catch (err) {
        console.error("❌ Error getDamagedDetail:", err);
        res.status(500).json({ message: "ไม่สามารถดึงรายละเอียดการชำรุดได้" });
    }
};

/* ---------------- Expired ---------------- */
exports.getExpiredHistory = async (req, res) => {
    try {
        const data = await expiredHistoryModel.getAllExpired();
        res.json(data);
    } catch (err) {
        console.error("❌ Error getExpiredHistory:", err);
        res.status(500).json({ message: "ไม่สามารถดึงประวัติของหมดอายุได้" });
    }
};

// /* ---------------- StockOut ---------------- */
exports.getStockoutHistory = async (req, res) => {
    try {
        // ✅ ใช้ฟังก์ชันใหม่จาก model
        const data = await stockoutHistoryModel.getAllStockoutHeaders();
        res.json(data);
    } catch (err) {
        console.error("❌ Error getStockoutHistory:", err);
        res.status(500).json({ message: "ไม่สามารถดึงประวัติการนำออกได้" });
    }
};

exports.getStockoutById = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await stockoutHistoryModel.getById(id);

        if (!data || data.length === 0) {
            return res.status(404).json({ message: "ไม่พบข้อมูลเอกสารนี้" });
        }

        res.json(data);
    } catch (err) {
        console.error("❌ Error getStockoutById:", err);
        res.status(500).json({ message: "ไม่สามารถดึงรายละเอียดการนำออกได้" });
    }
};