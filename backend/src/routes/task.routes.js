const express = require('express');

const taskController = require('../controllers/task.controller');
const validate = require('../middleware/validate');
const { createTaskSchema, updateTaskSchema, reorderTasksSchema } = require('../validators/task.validator');

const router = express.Router();

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: List all tasks across projects (optional ?projectId= and ?status= filters)
 *     tags: [Tasks]
 *     parameters:
 *       - { name: projectId, in: query, required: false, schema: { type: integer } }
 *       - { name: status, in: query, required: false, schema: { type: string, enum: [TODO, IN_PROGRESS, BLOCKED, COMPLETED, CANCELLED] } }
 *       - { name: page, in: query, schema: { type: integer, minimum: 1 }, description: 'Page number (paginated response when present).' }
 *       - { name: limit, in: query, schema: { type: integer, minimum: 1, maximum: 100 } }
 *       - { name: search, in: query, schema: { type: string }, description: 'Case-insensitive search across task code/name.' }
 *       - { name: sortBy, in: query, schema: { type: string }, description: 'taskCode, name, status, progressPercentage, plannedStartDate, plannedEndDate or dueDate.' }
 *       - { name: sortDir, in: query, schema: { type: string, enum: [asc, desc] } }
 *     responses:
 *       200:
 *         description: List of tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Task' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *
 * /api/projects/{projectId}/tasks:
 *   get:
 *     summary: List tasks of one project
 *     tags: [Tasks]
 *     parameters:
 *       - { name: projectId, in: path, required: true, schema: { type: integer } }
 *     responses:
 *       200:
 *         description: List of project tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Task' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   post:
 *     summary: Create a task in a project (supports stakeholders and dependencies)
 *     tags: [Tasks]
 *     parameters:
 *       - { name: projectId, in: path, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/TaskInput' }
 *     responses:
 *       201:
 *         description: Created task
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Task' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *
 * /api/projects/{projectId}/tasks/reorder:
 *   put:
 *     summary: Persist a manual display order for a project's tasks (Gantt drag-to-reorder)
 *     tags: [Tasks]
 *     parameters:
 *       - { name: projectId, in: path, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [taskIds]
 *             properties:
 *               taskIds:
 *                 type: array
 *                 items: { type: integer }
 *                 description: Complete ordered list of the project's task ids
 *     responses:
 *       200:
 *         description: Tasks with the new order applied
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *
 * /api/tasks/{id}:
 *   get:
 *     summary: Get a single task with dependencies and stakeholders
 *     tags: [Tasks]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: integer } }
 *     responses:
 *       200:
 *         description: Task detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Task' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   put:
 *     summary: Update a task (stakeholders/dependencyIds are replaced when provided)
 *     tags: [Tasks]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/TaskUpdate' }
 *     responses:
 *       200:
 *         description: Updated task
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Task' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: integer } }
 *     responses:
 *       200:
 *         description: Task deleted
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/projects/:projectId/tasks', taskController.listByProject);
router.post('/projects/:projectId/tasks', validate(createTaskSchema), taskController.create);
router.put('/projects/:projectId/tasks/reorder', validate(reorderTasksSchema), taskController.reorder);
router.get('/tasks', taskController.listAll);
router.get('/tasks/:id', taskController.getById);
router.put('/tasks/:id', validate(updateTaskSchema), taskController.update);
router.delete('/tasks/:id', taskController.remove);

module.exports = router;
