const express = require('express');
const router = express.Router();
const nmraLogController = require('../controllers/nmraLogController');

router.get('/', nmraLogController.getNmraLogs);

module.exports = router;