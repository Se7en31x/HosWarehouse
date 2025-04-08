const express = require('express');
const router = express.Router();
const { read } = require('../controllers/profileController')

// router.get('/profile',(req, res) =>{
//     res.send('กรูมาแล้วนะะะะ')
// });

const profileController = require('../controllers/profileController');

router.get('/profile', (req,res) =>{
    res.send('Hello Profile module')
});

router.get('/profile/:id',profileController.getProfile);
router.get('/profiles',profileController.getAllProfile);

module.exports = router