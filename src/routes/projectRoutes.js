const express = require('express');
const router = express.Router();
const {
  createProject,
  getProjects,
  deleteProject,
} = require('../controllers/projectController');

router.post('/', createProject);
router.get('/', getProjects);
router.delete('/:id', deleteProject);

module.exports = router;
