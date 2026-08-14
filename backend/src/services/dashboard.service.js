const { isTaskOverdue, isProjectDelayed } = require('../utils/delay');
const { riskLevel } = require('../utils/riskLevel');
const dashboardRepository = require('../repositories/dashboard.repository');
const projectRepository = require('../repositories/project.repository');
const taskRepository = require('../repositories/task.repository');
const riskRepository = require('../repositories/risk.repository');

const STATUS_LIST = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED'];

function countBy(items, keyFn) {
  const counts = new Map();
  for (const item of items) {
    const key = keyFn(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

class DashboardService {
  async getSummary() {
    const totalProjects = await projectRepository.totalCount();
    const activeProjects = await projectRepository.countByStatus('IN_PROGRESS');
    const completedProjects = await projectRepository.countByStatus('COMPLETED');

    const totalTasks = await taskRepository.totalCount();
    const taskStatusCounts = countBy(await taskRepository.findDelayScanData(), (t) => t.status);
    const completedTasks = taskStatusCounts.get('COMPLETED') || 0;

    const overdueTasks = (await taskRepository.findDelayScanData()).filter((t) =>
      isTaskOverdue(t)
    ).length;
    const delayedProjects = (await projectRepository.findDelayScanData()).filter((p) =>
      isProjectDelayed(p)
    ).length;
    const openRisks = await riskRepository.openCount();

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      delayedProjects,
      totalTasks,
      completedTasks,
      overdueTasks,
      openRisks,
    };
  }

  async getProjects() {
    const rows = await dashboardRepository.projectsWithProgress();
    return rows.map((row) => ({
      id: row.id,
      projectCode: row.projectCode,
      name: row.name,
      status: row.status,
      progressPercentage: row.progressPercentage,
      plannedEndDate: row.plannedEndDate,
      actualEndDate: row.actualEndDate,
      taskCount: row._count.tasks,
      delayed: isProjectDelayed(row),
    }));
  }

  async getTasks() {
    const tasks = await taskRepository.findMany({});

    const byStatus = countBy(tasks, (t) => t.status);
    const byPriorityRaw = countBy(tasks, (t) => t.priority?.id);
    const byProjectRaw = countBy(tasks, (t) => t.projectId);

    // Resolve priority grouping into readable buckets.
    const priorityById = new Map(
      tasks.filter((t) => t.priority).map((t) => [t.priority.id, t.priority])
    );
    const byPriority = [...byPriorityRaw.entries()]
      .map(([priorityId, count]) => {
        const p = priorityById.get(priorityId);
        return {
          priorityId,
          name: p?.name ?? 'Unknown',
          level: p?.level ?? 99,
          color: p?.color ?? '#94a3b8',
          count,
        };
      })
      .sort((a, b) => a.level - b.level);

    const projectById = new Map(
      tasks.filter((t) => t.project).map((t) => [t.projectId, t.project])
    );
    const byProject = [...byProjectRaw.entries()]
      .map(([projectId, count]) => {
        const p = projectById.get(projectId);
        return { projectId, name: p?.name ?? 'Unknown', projectCode: p?.projectCode ?? '', count };
      })
      .sort((a, b) => b.count - a.count);

    const overdue = tasks.filter((t) => isTaskOverdue(t)).length;

    return {
      totalTasks: tasks.length,
      completed: byStatus.get('COMPLETED') || 0,
      inProgress: byStatus.get('IN_PROGRESS') || 0,
      blocked: byStatus.get('BLOCKED') || 0,
      todo: byStatus.get('TODO') || 0,
      cancelled: byStatus.get('CANCELLED') || 0,
      overdue,
      byStatus: STATUS_LIST.map((status) => ({
        status,
        count: byStatus.get(status) || 0,
      })),
      byPriority,
      byProject,
    };
  }

  async getRisks() {
    const risks = await riskRepository.findMany({});

    const byStatusRaw = countBy(risks, (r) => r.status);
    const byLevelRaw = countBy(risks, (r) => riskLevel(r.riskScore));

    const levels = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    const matrix = await riskRepository.findOpenMatrixCounts();

    return {
      totalRisks: risks.length,
      open: byStatusRaw.get('OPEN') || 0,
      mitigated: byStatusRaw.get('MITIGATED') || 0,
      closed: byStatusRaw.get('CLOSED') || 0,
      accepted: byStatusRaw.get('ACCEPTED') || 0,
      critical: byLevelRaw.get('CRITICAL') || 0,
      high: byLevelRaw.get('HIGH') || 0,
      byLevel: levels.map((level) => ({ level, count: byLevelRaw.get(level) || 0 })),
      byStatus: ['OPEN', 'MITIGATED', 'CLOSED', 'ACCEPTED'].map((status) => ({
        status,
        count: byStatusRaw.get(status) || 0,
      })),
      // Risk matrix: open risks by (probability, impact) cell.
      matrix: matrix.map((m) => ({
        probability: m.probability,
        impact: m.impact,
        count: m._count._all,
      })),
    };
  }
}

module.exports = new DashboardService();
