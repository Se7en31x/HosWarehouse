// backend/controllers/supplierController.js
const supplierModel = require('../models/supplierModel');

exports.getSuppliers = async (req, res) => {
    try {
        const suppliers = await supplierModel.getAllSuppliers();
        res.status(200).json(suppliers);
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        res.status(500).json({ message: 'Error fetching suppliers data' });
    }
};