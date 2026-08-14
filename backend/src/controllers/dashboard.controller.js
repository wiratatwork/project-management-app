const asyncHandler = require('../utils/asyncHandler');
const dashboardService = require('../services/dashboard.service');

const summary = asyncHandler(async (req, res) => {
  const data = await dashboardService.getSummary();
  res.json({ success: true, data });
});

const projects = asyncHandler(async (req, res) => {
  const data = await dashboardService.getProjects();
  res.json({ success: true, data });
});

const tasks = asyncHandler(async (req, res) => {
  const data = await dashboardService.getTasks();
  res.json({ success: true, data });
});

const risks = asyncHandler(async (req, res) => {
  const data = await dashboardService.getRisks();
  res.json({ success: true, data });
});

module.exports = { summary, projects, tasks, risks };
