const express = require('express');

const { requireAuth } = require('../middleware/auth');

const authRoutes = require('./auth.routes');
const ganttRoutes = require('./gantt.routes');
const taskRoutes = require('./task.routes');
const riskRoutes = require('./risk.routes');
const projectRoutes = require('./project.routes');
const stakeholderRoutes = require('./stakeholder.routes');
const priorityRoutes = require('./priority.routes');
const dashboardRoutes = require('./dashboard.routes');

const router = express.Router();

// Public routes
router.use('/auth', authRoutes);

// Everything below requires a valid JWT
router.use(requireAuth);

// Order matters: mount the most specific paths first.
router.use(ganttRoutes); // GET    /projects/:projectId/gantt
router.use(taskRoutes); //  GET/POST /projects/:projectId/tasks, GET/PUT/DELETE /tasks/...
router.use(riskRoutes); //  GET/POST /projects/:projectId/risks, GET/PUT/DELETE /risks/...
router.use(projectRoutes); // /projects, /projects/:id
router.use(stakeholderRoutes); // /stakeholders
router.use(priorityRoutes); // /priorities
router.use(dashboardRoutes); // /dashboard/...

module.exports = router;
