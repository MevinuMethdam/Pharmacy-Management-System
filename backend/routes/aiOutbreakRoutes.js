const express = require('express');
const router = express.Router();
const aiOutbreakController = require('../controllers/aiOutbreakController');

router.get('/analyze', aiOutbreakController.analyzeOutbreakTrends);

router.get('/history', aiOutbreakController.getOutbreakHistory);

module.exports = router;