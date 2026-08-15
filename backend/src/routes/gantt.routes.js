const express = require('express');

const ganttController = require('../controllers/gantt.controller');

const router = express.Router();

router.get('/gantt', ganttController.getAllGantt);
router.get('/projects/:projectId/gantt', ganttController.getProjectGantt);

module.exports = router;
