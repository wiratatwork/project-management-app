const asyncHandler = require('../utils/asyncHandler');
const { parseId } = require('../utils/ids');
const { parsePagination, respondList } = require('../utils/pagination');
const taskService = require('../services/task.service');

const listByProject = asyncHandler(async (req, res) => {
  const projectId = parseId(req.params.projectId);
  if (req.query.page !== undefined) {
    const pg = parsePagination(req.query);
    const { rows, total } = await taskService.listByProjectPage(projectId, pg);
    respondList(res, req, rows, total);
    return;
  }
  const data = await taskService.listByProject(projectId);
  res.json({ success: true, data });
});

const listAll = asyncHandler(async (req, res) => {
  const filters = {};
  if (req.query.projectId) filters.projectId = parseId(req.query.projectId);
  if (req.query.status) filters.status = String(req.query.status);
  if (req.query.page !== undefined) {
    const pg = parsePagination(req.query);
    const { rows, total } = await taskService.listAllPage(pg, filters);
    respondList(res, req, rows, total);
    return;
  }
  const data = await taskService.listAll(filters);
  res.json({ success: true, data });
});

const getById = asyncHandler(async (req, res) => {
  const data = await taskService.getById(parseId(req.params.id));
  res.json({ success: true, data });
});

const create = asyncHandler(async (req, res) => {
  const data = await taskService.create(parseId(req.params.projectId), req.body);
  res.status(201).json({ success: true, data });
});

const update = asyncHandler(async (req, res) => {
  const data = await taskService.update(parseId(req.params.id), req.body);
  res.json({ success: true, data });
});

const remove = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  await taskService.remove(id);
  res.json({ success: true, data: { id, deleted: true } });
});

const reorder = asyncHandler(async (req, res) => {
  const data = await taskService.reorder(parseId(req.params.projectId), req.body.taskIds);
  res.json({ success: true, data });
});

module.exports = { listByProject, listAll, getById, create, update, remove, reorder };
