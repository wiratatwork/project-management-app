const AppError = require('../utils/AppError');
const { calculateProjectProgress } = require('../utils/progress');
const projectRepository = require('../repositories/project.repository');
const taskRepository = require('../repositories/task.repository');
const { shapeProject, shapeProjectDetail } = require('./shapers');
const { assertStakeholdersExist } = require('./helpers');

class ProjectService {
  async list() {
    const projects = await projectRepository.findAll();
    return projects.map(shapeProject);
  }

  /** Paginated list for the DataTable (server-side search/sort/paging). */
  async listPage({ page, limit, search, sortBy, sortDir }) {
    const { rows, total } = await projectRepository.findPage({ page, limit, search, sortBy, sortDir, skip: (page - 1) * limit });
    return { rows: rows.map(shapeProject), total };
  }

  async getById(id) {
    const project = await projectRepository.findById(id);
    if (!project) {
      throw new AppError('Project not found', { code: 'NOT_FOUND', statusCode: 404 });
    }
    return shapeProjectDetail(project);
  }

  async create(data) {
    const { stakeholderIds = [], ...fields } = data;
    if (stakeholderIds.length > 0) {
      await assertStakeholdersExist(stakeholderIds);
    }
    const project = await projectRepository.create(fields, stakeholderIds);
    return shapeProjectDetail(await projectRepository.findById(project.id));
  }

  async update(id, data) {
    const existing = await projectRepository.findByIdSimple(id);
    if (!existing) {
      throw new AppError('Project not found', { code: 'NOT_FOUND', statusCode: 404 });
    }

    const { stakeholderIds, ...fields } = data;
    if (stakeholderIds !== undefined && stakeholderIds.length > 0) {
      await assertStakeholdersExist(stakeholderIds);
    }

    if (Object.keys(fields).length > 0) {
      await projectRepository.update(id, fields);
    }
    if (stakeholderIds !== undefined) {
      await projectRepository.update(id, {}, stakeholderIds);
    }
    return shapeProjectDetail(await projectRepository.findById(id));
  }

  async remove(id) {
    await projectRepository.delete(id);
  }

  /**
   * Automatic project progress calculation.
   * Default strategy: completed task count / total task count * 100.
   * Weighted progress (SUM(progress * weight) / SUM(weight)) can be enabled
   * later without schema changes — see utils/progress.js.
   */
  async recalculateProgress(projectId) {
    const tasks = await taskRepository.findManyByProject(projectId);
    const progress = calculateProjectProgress(tasks, { weighted: false });
    await projectRepository.updateProgress(projectId, progress);
    return progress;
  }
}

module.exports = new ProjectService();
