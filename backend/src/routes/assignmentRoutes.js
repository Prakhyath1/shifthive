const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/assignmentController');
const { auth, requireAdminOrManager } = require('../middleware/auth');

router.post('/', auth, ctrl.createAssignment);
router.put('/:id', auth, ctrl.updateAssignment);
router.delete('/:id', auth, ctrl.deleteAssignment);
router.get('/roster', auth, ctrl.getRoster);
router.get('/my-shifts', auth, ctrl.getMyShifts);
module.exports = router;