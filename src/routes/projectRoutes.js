const express = require('express');
const router = express.Router();
const {
  createProject,
  getProjects,
  updateProject,
  addSender,
  getSenders,
  removeSender,
  deleteProject,
  uploadLogo,
  getLogo,
  deleteLogo,
  getSuppressionList,
  addSuppression,
  removeSuppression,
  updateSenderWarmup,
  generateWebhookSecret,
  testWebhookEndpoint,
  rotateApiKey,
  getIpWhitelist,
  updateIpWhitelist,
  getProjectMembers,
  addProjectMember,
  updateProjectMember,
  removeProjectMember,
} = require('../controllers/projectController');
const { optionalProtect } = require('../middleware/authJwt');
const rateLimit = require('express-rate-limit');

// Rate limiter for workspace and project management APIs
const projectLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Rate limit exceeded for project actions.' },
});

router.use(projectLimiter);

// Apply optional JWT authentication to all project routes
router.use(optionalProtect);

router.post('/', createProject);
router.get('/', getProjects);
router.patch('/:id', updateProject);
router.post('/:id/senders', addSender);
router.get('/:id/senders', getSenders);
router.delete('/:id/senders/:senderId', removeSender);
router.delete('/:id', deleteProject);

// 1-Click API Key Rotation / Regeneration
router.post('/:id/api-key/rotate', rotateApiKey);

// IP Whitelisting (Security Guard)
router.get('/:id/ip-whitelist', getIpWhitelist);
router.patch('/:id/ip-whitelist', updateIpWhitelist);

// Team Workspaces & Collaborator Access
router.get('/:id/members', getProjectMembers);
router.post('/:id/members', addProjectMember);
router.patch('/:id/members/:memberId', updateProjectMember);
router.delete('/:id/members/:memberId', removeProjectMember);

// Webhook & Instant Delivery Alerts
router.post('/:id/webhook/secret', generateWebhookSecret);
router.post('/:id/webhook/test', testWebhookEndpoint);

// Smart Warm-up & Bounce Suppression routes
router.get('/:id/suppression', getSuppressionList);
router.post('/:id/suppression', addSuppression);
router.delete('/:id/suppression/:suppressionId', removeSuppression);
router.patch('/:id/senders/:senderId/warmup', updateSenderWarmup);

// Brand Logo Endpoints (1:1 Square Only, 1 Image Limit, Anti-Piracy verification)
router.post('/:id/logo', uploadLogo);
router.get('/:id/logo', getLogo);
router.delete('/:id/logo', deleteLogo);

module.exports = router;
