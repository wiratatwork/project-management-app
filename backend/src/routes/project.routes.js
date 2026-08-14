const express = require('express');

const projectController = require('../controllers/project.controller');
const validate = require('../middleware/validate');
const { createProjectSchema, updateProjectSchema } = require('../validators/project.validator');

const router = express.Router();

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: List all projects (with optional server-side pagination/search/sort)
 *     tags: [Projects]
 *     parameters:
 *       - { name: page, in: query, schema: { type: integer, minimum: 1 }, description: 'Page number. When omitted, returns a plain array (backward compatible).' }
 *       - { name: limit, in: query, schema: { type: integer, minimum: 1, maximum: 100 }, description: 'Rows per page (default 20).' }
 *       - { name: search, in: query, schema: { type: string }, description: 'Case-insensitive search across name/code/description.' }
 *       - { name: sortBy, in: query, schema: { type: string }, description: 'Column to sort by (projectCode, name, status, progressPercentage, plannedStartDate, plannedEndDate, taskCount, riskCount).' }
 *       - { name: sortDir, in: query, schema: { type: string, enum: [asc, desc] }, description: 'Sort direction (default asc).' }
 *     responses:
 *       200:
 *         description: List of projects (array, or { rows, total, page, limit, totalPages } when `page` is passed)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Project' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *   post:
 *     summary: Create a project
 *     tags: [Projects]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ProjectInput' }
 *     responses:
 *       201:
 *         description: Created project
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Project' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *
 * /api/projects/{id}:
 *   get:
 *     summary: Get a project with its tasks, risks and stakeholders
 *     tags: [Projects]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: integer } }
 *     responses:
 *       200:
 *         description: Project detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/ProjectDetail' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   put:
 *     summary: Update a project
 *     tags: [Projects]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ProjectUpdate' }
 *     responses:
 *       200:
 *         description: Updated project
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/ProjectDetail' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   delete:
 *     summary: Delete a project (cascades to tasks, risks, links)
 *     tags: [Projects]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: integer } }
 *     responses:
 *       200:
 *         description: Project deleted
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/projects', projectController.list);
router.get('/projects/:id', projectController.getById);
router.post('/projects', validate(createProjectSchema), projectController.create);
router.put('/projects/:id', validate(updateProjectSchema), projectController.update);
router.delete('/projects/:id', projectController.remove);

module.exports = router;
