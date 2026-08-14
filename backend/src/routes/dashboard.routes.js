const express = require('express');

const dashboardController = require('../controllers/dashboard.controller');

const router = express.Router();

/**
 * @swagger
 * /api/dashboard/summary:
 *   get:
 *     summary: Summary counts for the dashboard cards
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Summary counts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalProjects: { type: integer }
 *                     activeProjects: { type: integer }
 *                     completedProjects: { type: integer }
 *                     delayedProjects: { type: integer }
 *                     totalTasks: { type: integer }
 *                     completedTasks: { type: integer }
 *                     overdueTasks: { type: integer }
 *                     openRisks: { type: integer }
 *
 * /api/dashboard/projects:
 *   get:
 *     summary: Project progress rows for the dashboard
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Project progress list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: integer }
 *                       projectCode: { type: string }
 *                       name: { type: string }
 *                       status: { type: string }
 *                       progressPercentage: { type: number }
 *                       plannedEndDate: { type: string, format: date-time }
 *                       actualEndDate: { type: string, format: date-time, nullable: true }
 *                       taskCount: { type: integer }
 *                       delayed: { type: boolean }
 *
 * /api/dashboard/tasks:
 *   get:
 *     summary: Task dashboard aggregates and chart data
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Task aggregates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalTasks: { type: integer }
 *                     completed: { type: integer }
 *                     inProgress: { type: integer }
 *                     blocked: { type: integer }
 *                     todo: { type: integer }
 *                     cancelled: { type: integer }
 *                     overdue: { type: integer }
 *                     byStatus:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           status: { type: string }
 *                           count: { type: integer }
 *                     byPriority:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           priorityId: { type: integer }
 *                           name: { type: string }
 *                           level: { type: integer }
 *                           color: { type: string }
 *                           count: { type: integer }
 *                     byProject:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           projectId: { type: integer }
 *                           name: { type: string }
 *                           projectCode: { type: string }
 *                           count: { type: integer }
 *
 * /api/dashboard/risks:
 *   get:
 *     summary: Risk dashboard aggregates, distribution and matrix
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Risk aggregates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalRisks: { type: integer }
 *                     open: { type: integer }
 *                     mitigated: { type: integer }
 *                     closed: { type: integer }
 *                     accepted: { type: integer }
 *                     critical: { type: integer }
 *                     high: { type: integer }
 *                     byLevel:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           level: { type: string }
 *                           count: { type: integer }
 *                     byStatus:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           status: { type: string }
 *                           count: { type: integer }
 *                     matrix:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           probability: { type: integer }
 *                           impact: { type: integer }
 *                           count: { type: integer }
 */
router.get('/dashboard/summary', dashboardController.summary);
router.get('/dashboard/projects', dashboardController.projects);
router.get('/dashboard/tasks', dashboardController.tasks);
router.get('/dashboard/risks', dashboardController.risks);

module.exports = router;
