const asyncHandler = require('../utils/asyncHandler');
const { parseId } = require('../utils/ids');
const ganttService = require('../services/gantt.service');

const getProjectGantt = asyncHandler(async (req, res) => {
  const data = await ganttService.getProjectGantt(parseId(req.params.projectId));
  res.json({ success: true, data });
});

const getAllGantt = asyncHandler(async (req, res) => {
  const data = await ganttService.getAllGantt();
  res.json({ success: true, data });
});

module.exports = { getProjectGantt, getAllGantt };
