const express = require('express');
const router = express.Router();
const { send, getStatus, getReports } = require('../controllers/emailController');
const authenticateApiKey = require('../middleware/authApiKey');

// Send email (Authenticated via x-api-key)
router.post('/send', authenticateApiKey, send);

// Get delivery report for calling project (Authenticated via x-api-key)
router.get('/reports', authenticateApiKey, getReports);

// Public status check by trackingId
router.get('/status/:trackingId', getStatus);

module.exports = router;
