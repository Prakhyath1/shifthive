const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/swapController');
const { auth } = require('../middleware/auth');

router.post('/', auth, ctrl.createSwapRequest);
router.patch('/:id', auth, ctrl.handleSwap);
module.exports = router;
