const express = require('express');
const router = express.Router();
const expiredController = require('../controllers/expiredController');

// GET /api/expired
router.get('/expired', expiredController.getAll);

// POST /api/expired/action
router.post('/expired/action', expiredController.addAction);

// GET /api/expired/actions/:lot_id
router.get('/expired/actions/:lot_id', expiredController.getActionsByLotId);

module.exports = router;
