const express = require('express');

const priorityController = require('../controllers/priority.controller');
const validate = require('../middleware/validate');
const { createPrioritySchema, updatePrioritySchema } = require('../validators/priority.validator');

const router = express.Router();

/**
 * @swagger
 * /api/priorities:
 *   get:
 *     summary: List all priorities (ordered by level; optional server-side pagination/search/sort)
 *     tags: [Priorities]
 *     parameters:
 *       - { name: page, in: query, schema: { type: integer, minimum: 1 }, description: 'Page number (paginated response when present).' }
 *       - { name: limit, in: query, schema: { type: integer, minimum: 1, maximum: 100 } }
 *       - { name: search, in: query, schema: { type: string }, description: 'Case-insensitive search across name/description.' }
 *       - { name: sortBy, in: query, schema: { type: string }, description: 'name, level or description.' }
 *       - { name: sortDir, in: query, schema: { type: string, enum: [asc, desc] } }
 *     responses:
 *       200:
 *         description: List of priorities
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Priority' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *   post:
 *     summary: Create a priority
 *     tags: [Priorities]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PriorityInput' }
 *     responses:
 *       201:
 *         description: Created priority
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Priority' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *
 * /api/priorities/{id}:
 *   put:
 *     summary: Update a priority
 *     tags: [Priorities]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PriorityUpdate' }
 *     responses:
 *       200:
 *         description: Updated priority
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Priority' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   delete:
 *     summary: Delete a priority (fails with 409 while tasks use it)
 *     tags: [Priorities]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: integer } }
 *     responses:
 *       200:
 *         description: Priority deleted
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.get('/priorities', priorityController.list);
router.post('/priorities', validate(createPrioritySchema), priorityController.create);
router.put('/priorities/:id', validate(updatePrioritySchema), priorityController.update);
router.delete('/priorities/:id', priorityController.remove);

module.exports = router;
