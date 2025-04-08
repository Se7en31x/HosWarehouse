const express = require('express');
const router = express.Router();

router.get('/data',(req, res) =>{
    res.send('กรูมาแล้วนะะะะไอ่สัส')
});


module.exports = router