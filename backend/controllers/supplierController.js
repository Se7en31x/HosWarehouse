const supplierModel = require("../models/supplierModel");

// ✅ GET all
exports.getSuppliers = async (req, res) => {
  try {
    const suppliers = await supplierModel.getAllSuppliers();
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ GET by ID
exports.getSupplier = async (req, res) => {
  try {
    const supplier = await supplierModel.getSupplierById(req.params.id);
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });
    res.json(supplier);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ CREATE
exports.createSupplier = async (req, res) => {
  try {
    const userId = req.user?.id || null; // ✅ จาก token
    const supplier = await supplierModel.createSupplier({
      ...req.body,
      created_by: userId,
    });
    res.status(201).json(supplier);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ UPDATE
exports.updateSupplier = async (req, res) => {
  try {
    const userId = req.user?.id || null; // ✅ จาก token
    const supplier = await supplierModel.updateSupplier(req.params.id, {
      ...req.body,
      updated_by: userId,
    });
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });
    res.json(supplier);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ TOGGLE Active/Inactive
exports.toggleSupplierStatus = async (req, res) => {
  try {
    const { is_active } = req.body;
    const userId = req.user?.id || null; // ✅ จาก token
    const updated = await supplierModel.toggleSupplierStatus(
      req.params.id,
      is_active,
      userId
    );
    if (!updated) return res.status(404).json({ message: "Supplier not found" });
    res.json({ message: "Supplier status updated", supplier: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ DELETE
exports.deleteSupplier = async (req, res) => {
  try {
    await supplierModel.deleteSupplier(req.params.id);
    res.json({ message: "Supplier deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
