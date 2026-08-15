const express = require('express');

const priorityController = require('../controllers/priority.controller');
const validate = require('../middleware/validate');
const { createPrioritySchema, updatePrioritySchema } = require('../validators/priority.validator');

const router = express.Router();

router.get('/priorities', priorityController.list);
router.post('/priorities', validate(createPrioritySchema), priorityController.create);
router.put('/priorities/:id', validate(updatePrioritySchema), priorityController.update);
router.delete('/priorities/:id', priorityController.remove);

module.exports = router;
