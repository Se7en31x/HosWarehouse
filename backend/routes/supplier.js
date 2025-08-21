// backend/routes/supplierRoutes.js
const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');

router.get('/suppliers', supplierController.getSuppliers);

module.exports = router;