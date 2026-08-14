const express = require('express');

const stakeholderController = require('../controllers/stakeholder.controller');
const validate = require('../middleware/validate');
const {
  createStakeholderSchema,
  updateStakeholderSchema,
} = require('../validators/stakeholder.validator');

const router = express.Router();

/**
 * @swagger
 * /api/stakeholders:
 *   get:
 *     summary: List all stakeholders (with optional server-side pagination/search/sort)
 *     tags: [Stakeholders]
 *     parameters:
 *       - { name: page, in: query, schema: { type: integer, minimum: 1 }, description: 'Page number (paginated response when present).' }
 *       - { name: limit, in: query, schema: { type: integer, minimum: 1, maximum: 100 } }
 *       - { name: search, in: query, schema: { type: string }, description: 'Case-insensitive search across name/email/position/department/organization.' }
 *       - { name: sortBy, in: query, schema: { type: string }, description: 'name, email, position, department, organization, projectCount or taskCount.' }
 *       - { name: sortDir, in: query, schema: { type: string, enum: [asc, desc] } }
 *     responses:
 *       200:
 *         description: List of stakeholders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Stakeholder' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *   post:
 *     summary: Create a stakeholder
 *     tags: [Stakeholders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/StakeholderInput' }
 *     responses:
 *       201:
 *         description: Created stakeholder
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Stakeholder' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *
 * /api/stakeholders/{id}:
 *   get:
 *     summary: Get a stakeholder
 *     tags: [Stakeholders]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: integer } }
 *     responses:
 *       200:
 *         description: Stakeholder detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Stakeholder' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   put:
 *     summary: Update a stakeholder
 *     tags: [Stakeholders]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/StakeholderUpdate' }
 *     responses:
 *       200:
 *         description: Updated stakeholder
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Stakeholder' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   delete:
 *     summary: Delete a stakeholder (removes project/task links; risk ownership is unset)
 *     tags: [Stakeholders]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: integer } }
 *     responses:
 *       200:
 *         description: Stakeholder deleted
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/stakeholders', stakeholderController.list);
router.get('/stakeholders/:id', stakeholderController.getById);
router.post('/stakeholders', validate(createStakeholderSchema), stakeholderController.create);
router.put('/stakeholders/:id', validate(updateStakeholderSchema), stakeholderController.update);
router.delete('/stakeholders/:id', stakeholderController.remove);

module.exports = router;
