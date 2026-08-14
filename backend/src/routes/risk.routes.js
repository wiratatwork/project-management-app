const express = require('express');

const riskController = require('../controllers/risk.controller');
const validate = require('../middleware/validate');
const { createRiskSchema, updateRiskSchema } = require('../validators/risk.validator');

const router = express.Router();

/**
 * @swagger
 * /api/risks:
 *   get:
 *     summary: List all risks (optional ?projectId= and ?status= filters)
 *     tags: [Risks]
 *     parameters:
 *       - { name: projectId, in: query, required: false, schema: { type: integer } }
 *       - { name: status, in: query, required: false, schema: { type: string, enum: [OPEN, MITIGATED, CLOSED, ACCEPTED] } }
 *       - { name: page, in: query, schema: { type: integer, minimum: 1 }, description: 'Page number (paginated response when present).' }
 *       - { name: limit, in: query, schema: { type: integer, minimum: 1, maximum: 100 } }
 *       - { name: search, in: query, schema: { type: string }, description: 'Case-insensitive search across title/description/mitigation plan.' }
 *       - { name: sortBy, in: query, schema: { type: string }, description: 'title, probability, impact, riskScore, riskLevel, status or identifiedDate.' }
 *       - { name: sortDir, in: query, schema: { type: string, enum: [asc, desc] } }
 *     responses:
 *       200:
 *         description: List of risks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Risk' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *
 * /api/projects/{projectId}/risks:
 *   get:
 *     summary: List risks of one project
 *     tags: [Risks]
 *     parameters:
 *       - { name: projectId, in: path, required: true, schema: { type: integer } }
 *     responses:
 *       200:
 *         description: List of project risks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Risk' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   post:
 *     summary: Create a risk in a project (riskScore = probability * impact, computed server-side)
 *     tags: [Risks]
 *     parameters:
 *       - { name: projectId, in: path, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RiskInput' }
 *     responses:
 *       201:
 *         description: Created risk
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Risk' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *
 * /api/risks/{id}:
 *   get:
 *     summary: Get a single risk
 *     tags: [Risks]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: integer } }
 *     responses:
 *       200:
 *         description: Risk detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Risk' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   put:
 *     summary: Update a risk (riskScore is recomputed automatically)
 *     tags: [Risks]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RiskUpdate' }
 *     responses:
 *       200:
 *         description: Updated risk
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Risk' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   delete:
 *     summary: Delete a risk
 *     tags: [Risks]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: integer } }
 *     responses:
 *       200:
 *         description: Risk deleted
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/projects/:projectId/risks', riskController.listByProject);
router.post('/projects/:projectId/risks', validate(createRiskSchema), riskController.create);
router.get('/risks', riskController.listAll);
router.get('/risks/:id', riskController.getById);
router.put('/risks/:id', validate(updateRiskSchema), riskController.update);
router.delete('/risks/:id', riskController.remove);

module.exports = router;
