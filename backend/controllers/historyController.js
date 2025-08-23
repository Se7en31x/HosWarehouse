const {
  withdrawHistoryModel,
  borrowHistoryModel,
  returnHistoryModel,
  importHistoryModel,
  expiredHistoryModel,
  damagedHistoryModel,
  disposalHistoryModel,
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

exports.getImportHistory = async (req, res) => {
  try {
    const data = await importHistoryModel.getAllImport();
    res.status(200).json(data);
  } catch (err) {
    console.error('❌ Error getImportHistory:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงประวัติการนำเข้า' });
  }
};


// /* ---------------- Return ---------------- */
// exports.getReturnHistory = async (req, res) => {
//   try {
//     const data = await returnModel.getAll();
//     res.json(data);
//   } catch (err) {
//     console.error("❌ Error getReturnHistory:", err);
//     res.status(500).json({ message: "ไม่สามารถดึงประวัติการคืนได้" });
//   }
// };

// /* ---------------- Damaged ---------------- */
// exports.getDamagedHistory = async (req, res) => {
//   try {
//     const data = await damagedModel.getAll();
//     res.json(data);
//   } catch (err) {
//     console.error("❌ Error getDamagedHistory:", err);
//     res.status(500).json({ message: "ไม่สามารถดึงประวัติการชำรุดได้" });
//   }
// };

// /* ---------------- Expired ---------------- */
// exports.getExpiredHistory = async (req, res) => {
//   try {
//     const data = await expiredModel.getAll();
//     res.json(data);
//   } catch (err) {
//     console.error("❌ Error getExpiredHistory:", err);
//     res.status(500).json({ message: "ไม่สามารถดึงประวัติของหมดอายุได้" });
//   }
// };

// /* ---------------- Disposal ---------------- */
// exports.getDisposalHistory = async (req, res) => {
//   try {
//     const data = await disposalModel.getAll();
//     res.json(data);
//   } catch (err) {
//     console.error("❌ Error getDisposalHistory:", err);
//     res.status(500).json({ message: "ไม่สามารถดึงประวัติการนำออกได้" });
//   }
// };
