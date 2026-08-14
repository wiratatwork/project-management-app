const asyncHandler = require('../utils/asyncHandler');
const { parseId } = require('../utils/ids');
const { parsePagination, respondList } = require('../utils/pagination');
const stakeholderService = require('../services/stakeholder.service');

const list = asyncHandler(async (req, res) => {
  if (req.query.page !== undefined) {
    const pg = parsePagination(req.query);
    const { rows, total } = await stakeholderService.listPage(pg);
    respondList(res, req, rows, total);
    return;
  }
  const data = await stakeholderService.list();
  res.json({ success: true, data });
});

const getById = asyncHandler(async (req, res) => {
  const data = await stakeholderService.getById(parseId(req.params.id));
  res.json({ success: true, data });
});

const create = asyncHandler(async (req, res) => {
  const data = await stakeholderService.create(req.body);
  res.status(201).json({ success: true, data });
});

const update = asyncHandler(async (req, res) => {
  const data = await stakeholderService.update(parseId(req.params.id), req.body);
  res.json({ success: true, data });
});

const remove = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  await stakeholderService.remove(id);
  res.json({ success: true, data: { id, deleted: true } });
});

module.exports = { list, getById, create, update, remove };
