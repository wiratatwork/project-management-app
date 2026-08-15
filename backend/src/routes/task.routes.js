const express = require('express');

const taskController = require('../controllers/task.controller');
const validate = require('../middleware/validate');
const { createTaskSchema, updateTaskSchema, reorderTasksSchema } = require('../validators/task.validator');

const router = express.Router();

router.get('/projects/:projectId/tasks', taskController.listByProject);
router.post('/projects/:projectId/tasks', validate(createTaskSchema), taskController.create);
router.put('/projects/:projectId/tasks/reorder', validate(reorderTasksSchema), taskController.reorder);
router.get('/tasks', taskController.listAll);
router.get('/tasks/:id', taskController.getById);
router.put('/tasks/:id', validate(updateTaskSchema), taskController.update);
router.delete('/tasks/:id', taskController.remove);

module.exports = router;
