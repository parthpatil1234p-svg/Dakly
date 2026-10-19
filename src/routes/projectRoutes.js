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
} = require('../controllers/projectController');
const { optionalProtect } = require('../middleware/authJwt');

// Apply optional JWT authentication to all project routes
router.use(optionalProtect);

router.post('/', createProject);
router.get('/', getProjects);
router.patch('/:id', updateProject);
router.post('/:id/senders', addSender);
router.get('/:id/senders', getSenders);
router.delete('/:id/senders/:senderId', removeSender);
router.delete('/:id', deleteProject);

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
