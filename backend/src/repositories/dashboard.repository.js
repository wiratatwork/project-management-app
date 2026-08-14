const prisma = require('../prisma/client');

class DashboardRepository {
  async tasksByStatus() {
    return prisma.task.groupBy({ by: ['status'], _count: { _all: true } });
  }

  async tasksByPriority() {
    return prisma.task.groupBy({
      by: ['priorityId'],
      _count: { _all: true },
      orderBy: { _count: { priorityId: 'desc' } },
    });
  }

  async tasksByProject() {
    return prisma.task.groupBy({
      by: ['projectId'],
      _count: { _all: true },
      orderBy: { _count: { projectId: 'desc' } },
    });
  }

  async projectsWithProgress() {
    return prisma.project.findMany({
      select: {
        id: true,
        projectCode: true,
        name: true,
        status: true,
        progressPercentage: true,
        plannedEndDate: true,
        actualEndDate: true,
        _count: { select: { tasks: true } },
      },
      orderBy: [{ status: 'asc' }, { plannedEndDate: 'asc' }],
    });
  }
}

module.exports = new DashboardRepository();
