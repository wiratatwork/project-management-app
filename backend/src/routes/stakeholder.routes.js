const express = require('express');

const stakeholderController = require('../controllers/stakeholder.controller');
const validate = require('../middleware/validate');
const {
  createStakeholderSchema,
  updateStakeholderSchema,
} = require('../validators/stakeholder.validator');

const router = express.Router();

router.get('/stakeholders', stakeholderController.list);
router.get('/stakeholders/:id', stakeholderController.getById);
router.post('/stakeholders', validate(createStakeholderSchema), stakeholderController.create);
router.put('/stakeholders/:id', validate(updateStakeholderSchema), stakeholderController.update);
router.delete('/stakeholders/:id', stakeholderController.remove);

module.exports = router;
