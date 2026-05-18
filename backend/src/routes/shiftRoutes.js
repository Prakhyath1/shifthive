const express = require('express');
const router = express.Router();
const { createShift, getShifts } = require('../controllers/shiftController');
const { auth, requireAdminOrManager } = require('../middleware/auth');

router.post('/', auth, requireAdminOrManager, createShift);
router.get('/', auth, getShifts);
module.exports = router;