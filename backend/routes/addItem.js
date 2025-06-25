const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { addNewItem } = require('../controllers/addItemController');
const addItemcontroller = require('../controllers/addItemController');


router.post('/addNewItem', upload.single('image'), addItemcontroller.addNewItem);

module.exports = router;
