const express = require('express');

const dashboardController = require('../controllers/dashboard.controller');

const router = express.Router();

router.get('/dashboard/summary', dashboardController.summary);
router.get('/dashboard/projects', dashboardController.projects);
router.get('/dashboard/tasks', dashboardController.tasks);
router.get('/dashboard/risks', dashboardController.risks);

module.exports = router;
