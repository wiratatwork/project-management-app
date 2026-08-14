const AppError = require('../utils/AppError');
const { buildGraph, wouldCreateCycle } = require('../utils/dependencyGraph');
const { todayUtc } = require('../utils/dateUtils');
const taskRepository = require('../repositories/task.repository');
const projectRepository = require('../repositories/project.repository');
const projectService = require('./project.service');
const { shapeTask } = require('./shapers');
const { assertStakeholdersExist, assertPrioritiesExist } = require('./helpers');

class TaskService {
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

  /**
   * Validate a desired dependency set for a task:
   *  - no self-dependency (A -> A)
   *  - no duplicates
   *  - all dependencies belong to the same project
   *  - no circular dependency (A -> B -> C -> A)
   */
  async assertDependenciesValid(projectId, taskId, dependencyIds) {
    const unique = [...new Set(dependencyIds)];
    if (unique.length !== dependencyIds.length) {
      throw new AppError('Duplicate dependency ids', {
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        details: [{ field: 'dependencyIds', message: 'dependencyIds must not contain duplicates' }],
      });
    }

    if (taskId != null && unique.includes(taskId)) {
      throw new AppError('A task cannot depend on itself', {
        code: 'CIRCULAR_DEPENDENCY',
        statusCode: 400,
        details: [{ field: 'dependencyIds', message: `Task ${taskId} cannot depend on itself` }],
      });
    }

    const projectTaskIds = new Set(
      (await taskRepository.findIdsByProject(projectId)).map((t) => t.id)
    );
    const missing = unique.filter((id) => !projectTaskIds.has(id));
    if (missing.length > 0) {
      throw new AppError('Dependencies must belong to the same project', {
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        details: [
          { field: 'dependencyIds', message: `Unknown dependency id(s): ${missing.join(', ')}` },
        ],
      });
    }

    // Cycle detection only matters for existing tasks (a brand-new task has no
    // outgoing dependencies yet, so it cannot create a cycle).
    if (taskId != null) {
      const rows = await taskRepository.findDependencyRowsByProject(projectId);
      const graph = buildGraph(rows);
      for (const depId of unique) {
        if (wouldCreateCycle(graph, taskId, depId)) {
          throw new AppError('Circular dependency detected', {
            code: 'CIRCULAR_DEPENDENCY',
            statusCode: 400,
            details: [
              {
                field: 'dependencyIds',
                message: `Task ${taskId} depending on task ${depId} would create a circular dependency`,
              },
            ],
          });
        }
      }
    }
  }

  async listByProject(projectId) {
    await this.assertProjectExists(projectId);
    const tasks = await taskRepository.findManyByProject(projectId);
    return tasks.map(shapeTask);
  }

  /** Paginated tasks of one project (DataTable). */
  async listByProjectPage(projectId, { page, limit, search, sortBy, sortDir }) {
    await this.assertProjectExists(projectId);
    const { rows, total } = await taskRepository.findPage({
      page,
      limit,
      search,
      sortBy,
      sortDir,
      skip: (page - 1) * limit,
      filters: { projectId },
    });
    return { rows: rows.map(shapeTask), total };
  }

  async listAll(filters = {}) {
    const tasks = await taskRepository.findMany(filters);
    return tasks.map(shapeTask);
  }

  /** Paginated tasks across projects (DataTable). */
  async listAllPage({ page, limit, search, sortBy, sortDir }, filters = {}) {
    const { rows, total } = await taskRepository.findPage({
      page,
      limit,
      search,
      sortBy,
      sortDir,
      skip: (page - 1) * limit,
      filters,
    });
    return { rows: rows.map(shapeTask), total };
  }

  async getById(id) {
    const task = await taskRepository.findById(id);
    if (!task) {
      throw new AppError('Task not found', { code: 'NOT_FOUND', statusCode: 404 });
    }
    return shapeTask(task);
  }

  async create(projectId, data) {
    const project = await this.assertProjectExists(projectId);

    const { stakeholders = [], dependencyIds = [], ...fields } = data;
    if (fields.priorityId) await assertPrioritiesExist([fields.priorityId]);
    if (stakeholders.length > 0) {
      await assertStakeholdersExist(stakeholders.map((s) => s.stakeholderId));
    }
    if (dependencyIds.length > 0) {
      await this.assertDependenciesValid(projectId, null, dependencyIds);
    }

    const taskData = {
      ...fields,
      projectId,
      status: fields.status || 'TODO',
      progressPercentage: fields.progressPercentage ?? 0,
    };

    // Auto task code: {projectCode}-{NNN} from a per-project counter that only
    // ever increments, so deleted task codes are never reused. An explicit
    // taskCode (e.g. seed data) is still honored.
    if (!taskData.taskCode) {
      const n = await projectRepository.bumpTaskCode(projectId);
      taskData.taskCode = `${project.projectCode}-${String(n - 1).padStart(3, '0')}`;
    }

    const task = await taskRepository.createWithRelations({
      taskData,
      stakeholders,
      dependencyIds,
    });

    await projectService.recalculateProgress(projectId);
    return shapeTask(task);
  }

  async update(id, data) {
    const existing = await taskRepository.findById(id);
    if (!existing) {
      throw new AppError('Task not found', { code: 'NOT_FOUND', statusCode: 404 });
    }

    const { stakeholders, dependencyIds, projectId, ...fields } = data;

    // Moving the task to another project: validate the target exists and that
    // the task's dependencies (new or existing) all live in the target project.
    const moved = projectId !== undefined && projectId !== existing.projectId;
    const targetProjectId = projectId ?? existing.projectId;
    if (moved) {
      await this.assertProjectExists(targetProjectId);
    }

    if (fields.priorityId) await assertPrioritiesExist([fields.priorityId]);
    if (stakeholders !== undefined && stakeholders.length > 0) {
      await assertStakeholdersExist(stakeholders.map((s) => s.stakeholderId));
    }
    if (dependencyIds !== undefined) {
      await this.assertDependenciesValid(targetProjectId, existing.id, dependencyIds);
    } else if (moved && existing.dependencies.length > 0) {
      // No dependency change on move: existing links must survive the move.
      await this.assertDependenciesValid(
        targetProjectId,
        existing.id,
        existing.dependencies.map((d) => d.dependsOnTaskId)
      );
    }

    const taskData = { ...fields };
    if (moved) {
      taskData.projectId = targetProjectId;
    }

    // When a task transitions to completed, keep progress and actual end
    // consistent. Only on the transition: a later update of an already
    // completed task (rename, move to another project, …) must not re-stamp
    // actualEndDate/progress, which would corrupt plan-vs-actual analysis.
    const nextStatus = fields.status ?? existing.status;
    const transitioningToCompleted = nextStatus === 'COMPLETED' && existing.status !== 'COMPLETED';
    if (transitioningToCompleted) {
      if (taskData.progressPercentage === undefined && existing.progressPercentage < 100) {
        taskData.progressPercentage = 100;
      }
      if (!fields.actualEndDate && !existing.actualEndDate) {
        taskData.actualEndDate = todayUtc();
      }
    }

    const task = await taskRepository.updateWithRelations(id, {
      taskData,
      stakeholders,
      dependencyIds,
    });

    // Progress of both the old and (if moved) the new project can change.
    await projectService.recalculateProgress(existing.projectId);
    if (moved) {
      await projectService.recalculateProgress(targetProjectId);
    }
    return shapeTask(task);
  }

  async remove(id) {
    const existing = await taskRepository.findById(id);
    if (!existing) {
      throw new AppError('Task not found', { code: 'NOT_FOUND', statusCode: 404 });
    }
    await taskRepository.delete(id);
    await projectService.recalculateProgress(existing.projectId);
  }

  /**
   * Persist a manual display order for a project's tasks (drag-to-reorder in
   * the Gantt chart). `taskIds` must be the complete set of the project's
   * tasks — partial lists are rejected so a filtered view can never silently
   * scramble the order of hidden tasks.
   */
  async reorder(projectId, taskIds) {
    await this.assertProjectExists(projectId);

    const unique = [...new Set(taskIds)];
    if (unique.length !== taskIds.length) {
      throw new AppError('Duplicate task ids in reorder request', {
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        details: [{ field: 'taskIds', message: 'taskIds must not contain duplicates' }],
      });
    }

    const projectTaskIds = (await taskRepository.findIdsByProject(projectId)).map((t) => t.id);
    if (projectTaskIds.length !== taskIds.length || !taskIds.every((id) => projectTaskIds.includes(id))) {
      throw new AppError('taskIds must contain every task of the project exactly once', {
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        details: [{ field: 'taskIds', message: 'Provide the complete ordered list of the project\'s tasks' }],
      });
    }

    await taskRepository.reorderProjectTasks(projectId, taskIds);
    const tasks = await taskRepository.findManyByProject(projectId);
    return tasks.map(shapeTask);
  }
}

module.exports = new TaskService();
