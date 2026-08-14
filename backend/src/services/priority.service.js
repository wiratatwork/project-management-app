const AppError = require('../utils/AppError');
const priorityRepository = require('../repositories/priority.repository');
const { shapePriority } = require('./shapers');

class PriorityService {
  async list() {
    const priorities = await priorityRepository.findAll();
    return priorities.map(shapePriority);
  }

  /** Paginated list for the DataTable (server-side search/sort/paging). */
  async listPage({ page, limit, search, sortBy, sortDir }) {
    const { rows, total } = await priorityRepository.findPage({ page, limit, search, sortBy, sortDir, skip: (page - 1) * limit });
    return { rows: rows.map(shapePriority), total };
  }

  async create(data) {
    const priority = await priorityRepository.create(data);
    return shapePriority(priority);
  }

  async update(id, data) {
    const existing = await priorityRepository.findById(id);
    if (!existing) {
      throw new AppError('Priority not found', { code: 'NOT_FOUND', statusCode: 404 });
    }
    const priority = await priorityRepository.update(id, data);
    return shapePriority(priority);
  }

  async remove(id) {
    const existing = await priorityRepository.findById(id);
    if (!existing) {
      throw new AppError('Priority not found', { code: 'NOT_FOUND', statusCode: 404 });
    }
    const inUse = await priorityRepository.taskCount(id);
    if (inUse > 0) {
      throw new AppError('Priority is assigned to tasks and cannot be deleted', {
        code: 'CONFLICT',
        statusCode: 409,
      });
    }
    await priorityRepository.delete(id);
  }
}

module.exports = new PriorityService();
