const express = require('express');
const router = express.Router();
const { login, setupAdmin } = require('../controllers/authController');

router.post('/login', login);

router.post('/setup-admin', setupAdmin);

module.exports = router;