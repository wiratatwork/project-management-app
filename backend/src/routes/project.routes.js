const express = require('express');

const projectController = require('../controllers/project.controller');
const validate = require('../middleware/validate');
const { createProjectSchema, updateProjectSchema } = require('../validators/project.validator');

const router = express.Router();

router.get('/projects', projectController.list);
router.get('/projects/:id', projectController.getById);
router.post('/projects', validate(createProjectSchema), projectController.create);
router.put('/projects/:id', validate(updateProjectSchema), projectController.update);
router.delete('/projects/:id', projectController.remove);

module.exports = router;
