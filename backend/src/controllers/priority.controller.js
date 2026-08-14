const asyncHandler = require('../utils/asyncHandler');
const { parseId } = require('../utils/ids');
const { parsePagination, respondList } = require('../utils/pagination');
const priorityService = require('../services/priority.service');

const list = asyncHandler(async (req, res) => {
  if (req.query.page !== undefined) {
    const pg = parsePagination(req.query);
    const { rows, total } = await priorityService.listPage(pg);
    respondList(res, req, rows, total);
    return;
  }
  const data = await priorityService.list();
  res.json({ success: true, data });
});

const create = asyncHandler(async (req, res) => {
  const data = await priorityService.create(req.body);
  res.status(201).json({ success: true, data });
});

const update = asyncHandler(async (req, res) => {
  const data = await priorityService.update(parseId(req.params.id), req.body);
  res.json({ success: true, data });
});

const remove = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  await priorityService.remove(id);
  res.json({ success: true, data: { id, deleted: true } });
});

module.exports = { list, create, update, remove };
