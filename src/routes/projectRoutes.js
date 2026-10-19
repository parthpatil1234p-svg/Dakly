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
} = require('../controllers/projectController');

router.post('/', createProject);
router.get('/', getProjects);
router.patch('/:id', updateProject);
router.post('/:id/senders', addSender);
router.get('/:id/senders', getSenders);
router.delete('/:id/senders/:senderId', removeSender);
router.delete('/:id', deleteProject);

module.exports = router;
