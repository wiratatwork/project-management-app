const express = require('express');

const riskController = require('../controllers/risk.controller');
const validate = require('../middleware/validate');
const { createRiskSchema, updateRiskSchema } = require('../validators/risk.validator');

const router = express.Router();

router.get('/projects/:projectId/risks', riskController.listByProject);
router.post('/projects/:projectId/risks', validate(createRiskSchema), riskController.create);
router.get('/risks', riskController.listAll);
router.get('/risks/:id', riskController.getById);
router.put('/risks/:id', validate(updateRiskSchema), riskController.update);
router.delete('/risks/:id', riskController.remove);

module.exports = router;
