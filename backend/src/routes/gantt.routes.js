const express = require('express');

const ganttController = require('../controllers/gantt.controller');

const router = express.Router();

/**
 * @swagger
 * /api/gantt:
 *   get:
 *     summary: Global Gantt data — every project with tasks, schedule summary and cross-project totals
 *     tags: [Gantt]
 *     responses:
 *       200:
 *         description: All projects with their Gantt data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     projects:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           project: { $ref: '#/components/schemas/Project' }
 *                           tasks:
 *                             type: array
 *                             items: { $ref: '#/components/schemas/Task' }
 *                           schedule:
 *                             type: object
 *                             properties:
 *                               ON_TRACK: { type: integer }
 *                               AT_RISK: { type: integer }
 *                               DELAYED: { type: integer }
 *                     schedule:
 *                       type: object
 *                       description: Cross-project schedule totals
 *                       properties:
 *                         ON_TRACK: { type: integer }
 *                         AT_RISK: { type: integer }
 *                         DELAYED: { type: integer }
 */
/**
 * @swagger
 * /api/projects/{projectId}/gantt:
 *   get:
 *     summary: Gantt chart data for a project (tasks with planned/actual dates, progress, dependencies)
 *     tags: [Gantt]
 *     parameters:
 *       - { name: projectId, in: path, required: true, schema: { type: integer } }
 *     responses:
 *       200:
 *         description: Gantt data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     project: { $ref: '#/components/schemas/Project' }
 *                     tasks:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Task' }
 *                     schedule:
 *                       type: object
 *                       description: Task schedule-health summary (drives the Gantt delay chips)
 *                       properties:
 *                         ON_TRACK: { type: integer, example: 4 }
 *                         AT_RISK: { type: integer, example: 1 }
 *                         DELAYED: { type: integer, example: 1 }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/gantt', ganttController.getAllGantt);
router.get('/projects/:projectId/gantt', ganttController.getProjectGantt);

module.exports = router;
