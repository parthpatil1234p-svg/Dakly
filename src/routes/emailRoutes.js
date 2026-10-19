const express = require('express');
const router = express.Router();
const {
  send,
  getStatus,
  getReports,
  getLogs,
  getStats,
  ping,
  getTemplates,
  previewTemplate,
  trackOpen,
  trackClick,
} = require('../controllers/emailController');
const authenticateApiKey = require('../middleware/authApiKey');

// Pre-built email templates catalog & preview
router.get('/templates', getTemplates);
router.post('/templates/preview', authenticateApiKey.optional, previewTemplate);

// Health Ping & API Key connection tester (Authenticated via x-api-key)
router.get('/ping', authenticateApiKey, ping);
router.post('/ping', authenticateApiKey, ping);

// Send email (Authenticated via x-api-key)
router.post('/send', authenticateApiKey, send);

// Search & Paginated delivery audit logs (Authenticated via x-api-key)
router.get('/logs', authenticateApiKey, getLogs);

// Real-time dashboard analytics & capacity (Authenticated via x-api-key)
router.get('/stats', authenticateApiKey, getStats);

// Legacy reports endpoint (Authenticated via x-api-key)
router.get('/reports', authenticateApiKey, getReports);

// Open & Click tracking endpoints (Publicly accessed by email clients and link redirects)
router.get('/track/open/:trackingId', trackOpen);
router.get('/track/click/:trackingId', trackClick);

// Public status check by trackingId
router.get('/status/:trackingId', getStatus);

module.exports = router;

