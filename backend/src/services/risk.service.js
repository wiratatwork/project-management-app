const AppError = require('../utils/AppError');
const { riskScore } = require('../utils/riskLevel');
const { todayUtc } = require('../utils/dateUtils');
const riskRepository = require('../repositories/risk.repository');
const projectRepository = require('../repositories/project.repository');
const { shapeRisk } = require('./shapers');
const { assertStakeholdersExist } = require('./helpers');

class RiskService {
  async assertProjectExists(projectId) {
    const project = await projectRepository.findByIdSimple(projectId);
    if (!project) {
      throw new AppError('Project not found', {
        code: 'NOT_FOUND',
        statusCode: 404,
        details: [{ field: 'projectId', message: `Project ${projectId} does not exist` }],
      });
    }
    return project;
  }

  async listByProject(projectId) {
    await this.assertProjectExists(projectId);
    const risks = await riskRepository.findManyByProject(projectId);
    return risks.map(shapeRisk);
  }

  /** Paginated risks of one project (DataTable). */
  async listByProjectPage(projectId, { page, limit, search, sortBy, sortDir }) {
    await this.assertProjectExists(projectId);
    const { rows, total } = await riskRepository.findPage({
      page,
      limit,
      search,
      sortBy,
      sortDir,
      skip: (page - 1) * limit,
      filters: { projectId },
    });
    return { rows: rows.map(shapeRisk), total };
  }

  async listAll(filters = {}) {
    const risks = await riskRepository.findMany(filters);
    return risks.map(shapeRisk);
  }

  /** Paginated risks across projects (DataTable). */
  async listAllPage({ page, limit, search, sortBy, sortDir }, filters = {}) {
    const { rows, total } = await riskRepository.findPage({
      page,
      limit,
      search,
      sortBy,
      sortDir,
      skip: (page - 1) * limit,
      filters,
    });
    return { rows: rows.map(shapeRisk), total };
  }

  async getById(id) {
    const risk = await riskRepository.findById(id);
    if (!risk) {
      throw new AppError('Risk not found', { code: 'NOT_FOUND', statusCode: 404 });
    }
    return shapeRisk(risk);
  }

  async create(projectId, data) {
    await this.assertProjectExists(projectId);
    if (data.ownerStakeholderId) {
      await assertStakeholdersExist([data.ownerStakeholderId]);
    }

    const riskData = {
      ...data,
      projectId,
      riskScore: riskScore(data.probability, data.impact),
    };

    // Closing/mitigating a risk records when it was resolved.
    if (['MITIGATED', 'CLOSED'].includes(riskData.status) && !riskData.resolvedDate) {
      riskData.resolvedDate = todayUtc();
    }

    const risk = await riskRepository.create(riskData);
    return shapeRisk(risk);
  }

  async update(id, data) {
    const existing = await riskRepository.findById(id);
    if (!existing) {
      throw new AppError('Risk not found', { code: 'NOT_FOUND', statusCode: 404 });
    }
    if (data.ownerStakeholderId) {
      await assertStakeholdersExist([data.ownerStakeholderId]);
    }

    const riskData = { ...data };

    // risk_score = probability * impact, always recomputed from current values.
    const probability = riskData.probability ?? existing.probability;
    const impact = riskData.impact ?? existing.impact;
    riskData.riskScore = riskScore(probability, impact);

    const nextStatus = riskData.status ?? existing.status;
    if (['MITIGATED', 'CLOSED'].includes(nextStatus) && !riskData.resolvedDate && !existing.resolvedDate) {
      riskData.resolvedDate = todayUtc();
    }
    if (riskData.status === 'OPEN') {
      riskData.resolvedDate = null; // reopened risk is no longer resolved
    }

    const risk = await riskRepository.update(id, riskData);
    return shapeRisk(risk);
  }

  async remove(id) {
    const existing = await riskRepository.findById(id);
    if (!existing) {
      throw new AppError('Risk not found', { code: 'NOT_FOUND', statusCode: 404 });
    }
    await riskRepository.delete(id);
  }
}

module.exports = new RiskService();
