const prisma = require('../prisma/client');
const { buildOrderBy, buildSearchWhere } = require('../utils/pagination');

const taskInclude = {
  priority: true,
  stakeholders: { include: { stakeholder: true } },
  dependencies: {
    include: { dependsOn: { select: { id: true, taskCode: true, name: true } } },
  },
  project: { select: { id: true, projectCode: true, name: true } },
};

class TaskRepository {
  async findManyByProject(projectId) {
    return prisma.task.findMany({
      where: { projectId },
      include: taskInclude,
      orderBy: [{ sortOrder: 'asc' }, { plannedStartDate: 'asc' }, { id: 'asc' }],
    });
  }

  /** All tasks, optionally filtered. */
  async findMany(filters = {}) {
    const where = {};
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.status) where.status = filters.status;
    return prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
    });
  }

  /** Paginated tasks with server-side search + sort (DataTable). */
  async findPage({ search, sortBy, sortDir, skip, limit, filters = {} }) {
    const sortMap = {
      taskCode: 'taskCode',
      name: 'name',
      status: 'status',
      progressPercentage: 'progressPercentage',
      plannedStartDate: 'plannedStartDate',
      plannedEndDate: 'plannedEndDate',
      dueDate: 'dueDate',
    };
    const where = {
      ...buildSearchWhere(search, ['taskCode', 'name']),
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    };
    const orderBy = buildOrderBy(sortBy, sortDir, sortMap, [{ dueDate: 'asc' }, { id: 'asc' }]);
    const [rows, total] = await Promise.all([
      prisma.task.findMany({ where, include: taskInclude, orderBy, skip, take: limit }),
      prisma.task.count({ where }),
    ]);
    return { rows, total };
  }

  async findById(id) {
    return prisma.task.findUnique({ where: { id }, include: taskInclude });
  }

  async findByIds(ids) {
    return prisma.task.findMany({
      where: { id: { in: ids } },
      select: { id: true, projectId: true },
    });
  }

  async findIdsByProject(projectId) {
    return prisma.task.findMany({
      where: { projectId },
      select: { id: true },
    });
  }

  /**
   * Create a task and (optionally) its stakeholder links and dependencies
   * inside one transaction.
   */
  async createWithRelations({ taskData, stakeholders = [], dependencyIds = [] }) {
    return prisma.$transaction(async (tx) => {
      const task = await tx.task.create({ data: taskData });
      if (stakeholders.length > 0) {
        await tx.taskStakeholder.createMany({
          data: stakeholders.map((s) => ({
            taskId: task.id,
            stakeholderId: s.stakeholderId,
            role: s.role || 'RESPONSIBLE',
          })),
        });
      }
      if (dependencyIds.length > 0) {
        await tx.taskDependency.createMany({
          data: dependencyIds.map((dependsOnTaskId) => ({
            taskId: task.id,
            dependsOnTaskId,
            dependencyType: 'FINISH_TO_START',
          })),
        });
      }
      return tx.task.findUnique({
        where: { id: task.id },
        include: taskInclude,
      });
    });
  }

  async updateWithRelations(id, { taskData, stakeholders, dependencyIds }) {
    return prisma.$transaction(async (tx) => {
      const task = await tx.task.update({ where: { id }, data: taskData });
      if (stakeholders !== undefined) {
        await tx.taskStakeholder.deleteMany({ where: { taskId: id } });
        if (stakeholders.length > 0) {
          await tx.taskStakeholder.createMany({
            data: stakeholders.map((s) => ({
              taskId: id,
              stakeholderId: s.stakeholderId,
              role: s.role || 'RESPONSIBLE',
            })),
          });
        }
      }
      if (dependencyIds !== undefined) {
        await tx.taskDependency.deleteMany({ where: { taskId: id } });
        if (dependencyIds.length > 0) {
          await tx.taskDependency.createMany({
            data: dependencyIds.map((dependsOnTaskId) => ({
              taskId: id,
              dependsOnTaskId,
              dependencyType: 'FINISH_TO_START',
            })),
          });
        }
      }
      return tx.task.findUnique({ where: { id }, include: taskInclude });
    });
  }

  async delete(id) {
    return prisma.task.delete({ where: { id } });
  }

  async deleteManyByProject(projectId) {
    return prisma.task.deleteMany({ where: { projectId } });
  }

  /**
   * Persist a manual row order for a project's tasks. `taskIds` must be the
   * complete, ordered list of the project's tasks; sortOrder is assigned by
   * list position inside one transaction.
   */
  async reorderProjectTasks(projectId, taskIds) {
    return prisma.$transaction(
      taskIds.map((taskId, index) =>
        prisma.task.update({ where: { id: taskId }, data: { sortOrder: index } })
      )
    );
  }

  /** All dependency rows for tasks of a project (for cycle detection). */
  async findDependencyRowsByProject(projectId) {
    return prisma.taskDependency.findMany({
      where: { task: { projectId } },
      select: { taskId: true, dependsOnTaskId: true },
    });
  }

  /** Dependencies of a single task (id -> dependsOnTaskId list). */
  async findDependencyRowsByTask(taskId) {
    return prisma.taskDependency.findMany({
      where: { taskId },
      select: { taskId: true, dependsOnTaskId: true },
    });
  }

  async countByStatus(projectId) {
    return prisma.task.groupBy({
      by: ['status'],
      where: projectId ? { projectId } : undefined,
      _count: { _all: true },
    });
  }

  /** Fields needed for overdue detection across all tasks. */
  async findDelayScanData() {
    return prisma.task.findMany({
      select: { id: true, status: true, dueDate: true },
    });
  }

  async totalCount() {
    return prisma.task.count();
  }
}

module.exports = new TaskRepository();
