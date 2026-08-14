const prisma = require('../prisma/client');
const { buildOrderBy, buildSearchWhere } = require('../utils/pagination');

const projectInclude = {
  _count: { select: { tasks: true, risks: true } },
  stakeholders: { include: { stakeholder: true } },
};

class ProjectRepository {
  async findAll() {
    return prisma.project.findMany({
      include: projectInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Paginated projects with server-side search + sort (DataTable). */
  async findPage({ search, sortBy, sortDir, skip, limit }) {
    const sortMap = {
      projectCode: 'projectCode',
      name: 'name',
      status: 'status',
      progressPercentage: 'progressPercentage',
      plannedStartDate: 'plannedStartDate',
      plannedEndDate: 'plannedEndDate',
      createdAt: 'createdAt',
      taskCount: (dir) => ({ tasks: { _count: dir } }),
      riskCount: (dir) => ({ risks: { _count: dir } }),
    };
    const where = buildSearchWhere(search, ['projectCode', 'name', 'description']);
    const orderBy = buildOrderBy(sortBy, sortDir, sortMap, [{ createdAt: 'desc' }]);
    const [rows, total] = await Promise.all([
      prisma.project.findMany({ where, include: projectInclude, orderBy, skip, take: limit }),
      prisma.project.count({ where }),
    ]);
    return { rows, total };
  }

  async findById(id) {
    return prisma.project.findUnique({
      where: { id },
      include: {
        ...projectInclude,
        tasks: {
          orderBy: [{ plannedStartDate: 'asc' }, { id: 'asc' }],
          include: {
            priority: true,
            stakeholders: { include: { stakeholder: true } },
            dependencies: { include: { dependsOn: { select: { id: true, name: true, taskCode: true } } } },
          },
        },
        risks: { include: { owner: true }, orderBy: { riskScore: 'desc' } },
      },
    });
  }

  async findByIdSimple(id) {
    return prisma.project.findUnique({ where: { id } });
  }

  /** Atomically reserve the next auto task-code number (never reused). */
  async bumpTaskCode(projectId) {
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { nextTaskNumber: { increment: 1 } },
      select: { nextTaskNumber: true },
    });
    return updated.nextTaskNumber;
  }

  async create(data, stakeholderIds = []) {
    return prisma.project.create({
      data: {
        ...data,
        stakeholders: {
          create: stakeholderIds.map((stakeholderId) => ({ stakeholderId })),
        },
      },
      include: projectInclude,
    });
  }

  async update(id, data, stakeholderIds) {
    return prisma.$transaction(async (tx) => {
      const project = await tx.project.update({ where: { id }, data });
      if (stakeholderIds !== undefined) {
        await tx.projectStakeholder.deleteMany({ where: { projectId: id } });
        if (stakeholderIds.length > 0) {
          await tx.projectStakeholder.createMany({
            data: stakeholderIds.map((stakeholderId) => ({ projectId: id, stakeholderId })),
          });
        }
      }
      return project;
    });
  }

  async delete(id) {
    return prisma.project.delete({ where: { id } });
  }

  async updateProgress(id, progressPercentage) {
    return prisma.project.update({ where: { id }, data: { progressPercentage } });
  }

  async countByStatus(status) {
    return prisma.project.count({ where: { status } });
  }

  /** All projects with only the fields needed for delay detection. */
  async findDelayScanData() {
    return prisma.project.findMany({
      select: { id: true, status: true, plannedEndDate: true },
    });
  }

  async totalCount() {
    return prisma.project.count();
  }
}

module.exports = new ProjectRepository();
