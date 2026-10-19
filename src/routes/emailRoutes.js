const express = require('express');
const router = express.Router();
const { send, getStatus, getReports, getLogs, getStats } = require('../controllers/emailController');
const authenticateApiKey = require('../middleware/authApiKey');

// Send email (Authenticated via x-api-key)
router.post('/send', authenticateApiKey, send);

// Search & Paginated delivery audit logs (Authenticated via x-api-key)
router.get('/logs', authenticateApiKey, getLogs);

// Real-time dashboard analytics & capacity (Authenticated via x-api-key)
router.get('/stats', authenticateApiKey, getStats);

// Legacy reports endpoint (Authenticated via x-api-key)
router.get('/reports', authenticateApiKey, getReports);

// Public status check by trackingId
router.get('/status/:trackingId', getStatus);

module.exports = router;
