const AppError = require('../utils/AppError');
const stakeholderRepository = require('../repositories/stakeholder.repository');
const { shapeStakeholder } = require('./shapers');

class StakeholderService {
  async list() {
    const stakeholders = await stakeholderRepository.findAll();
    return stakeholders.map(shapeStakeholder);
  }

  /** Paginated list for the DataTable (server-side search/sort/paging). */
  async listPage({ page, limit, search, sortBy, sortDir }) {
    const { rows, total } = await stakeholderRepository.findPage({ page, limit, search, sortBy, sortDir, skip: (page - 1) * limit });
    return { rows: rows.map(shapeStakeholder), total };
  }

  async getById(id) {
    const stakeholder = await stakeholderRepository.findById(id);
    if (!stakeholder) {
      throw new AppError('Stakeholder not found', { code: 'NOT_FOUND', statusCode: 404 });
    }
    return shapeStakeholder(stakeholder);
  }

  async create(data) {
    const stakeholder = await stakeholderRepository.create(data);
    return shapeStakeholder(stakeholder);
  }

  async update(id, data) {
    const existing = await stakeholderRepository.findById(id);
    if (!existing) {
      throw new AppError('Stakeholder not found', { code: 'NOT_FOUND', statusCode: 404 });
    }
    const stakeholder = await stakeholderRepository.update(id, data);
    return shapeStakeholder(stakeholder);
  }

  async remove(id) {
    const existing = await stakeholderRepository.findById(id);
    if (!existing) {
      throw new AppError('Stakeholder not found', { code: 'NOT_FOUND', statusCode: 404 });
    }
    await stakeholderRepository.delete(id);
  }
}

module.exports = new StakeholderService();
