const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reportController');
const { auth } = require('../middleware/auth');

router.get('/shift-history', auth, ctrl.getShiftHistory);
module.exports = router;