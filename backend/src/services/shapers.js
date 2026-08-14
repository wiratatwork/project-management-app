const { isTaskOverdue, isProjectDelayed, taskScheduleStatus } = require('../utils/delay');
const { riskLevel } = require('../utils/riskLevel');

const DAY_MS = 24 * 60 * 60 * 1000;

function diffDays(start, end) {
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  return Math.round((b - a) / DAY_MS);
}

function shapeStakeholderRef(ps) {
  return {
    stakeholderId: ps.stakeholderId,
    name: ps.stakeholder.name,
    email: ps.stakeholder.email,
    position: ps.stakeholder.position,
  };
}

function shapeTask(task) {
  const schedule = taskScheduleStatus(task);
  const shaped = {
    id: task.id,
    projectId: task.projectId,
    taskCode: task.taskCode,
    name: task.name,
    description: task.description,
    priorityId: task.priorityId,
    priority: task.priority
      ? {
          id: task.priority.id,
          name: task.priority.name,
          level: task.priority.level,
          color: task.priority.color,
        }
      : null,
    plannedStartDate: task.plannedStartDate,
    plannedEndDate: task.plannedEndDate,
    actualStartDate: task.actualStartDate,
    actualEndDate: task.actualEndDate,
    dueDate: task.dueDate,
    status: task.status,
    progressPercentage: task.progressPercentage,
    sortOrder: task.sortOrder ?? 0,
    overdue: isTaskOverdue(task),
    scheduleStatus: schedule.status,
    scheduleDaysLate: schedule.daysLate,
    startedLateDays: schedule.startedLateDays,
    stakeholders: (task.stakeholders || []).map((s) => ({
      stakeholderId: s.stakeholderId,
      role: s.role,
      name: s.stakeholder.name,
      email: s.stakeholder.email,
    })),
    dependencies: (task.dependencies || []).map((d) => ({
      id: d.id,
      taskId: d.taskId,
      dependsOnTaskId: d.dependsOnTaskId,
      dependencyType: d.dependencyType,
      taskCode: d.dependsOn?.taskCode,
      name: d.dependsOn?.name,
    })),
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
  if (task.project) {
    shaped.project = {
      id: task.project.id,
      projectCode: task.project.projectCode,
      name: task.project.name,
    };
  }
  return shaped;
}

function shapeProject(project) {
  return {
    id: project.id,
    projectCode: project.projectCode,
    name: project.name,
    description: project.description,
    plannedStartDate: project.plannedStartDate,
    plannedEndDate: project.plannedEndDate,
    actualStartDate: project.actualStartDate,
    actualEndDate: project.actualEndDate,
    status: project.status,
    progressPercentage: project.progressPercentage,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    taskCount: project._count?.tasks ?? 0,
    riskCount: project._count?.risks ?? 0,
    delayed: isProjectDelayed(project),
    stakeholders: (project.stakeholders || []).map(shapeStakeholderRef),
  };
}

function shapeProjectDetail(project) {
  const base = shapeProject(project);
  let plannedDurationDays = null;
  if (project.plannedStartDate && project.plannedEndDate) {
    plannedDurationDays = diffDays(project.plannedStartDate, project.plannedEndDate);
  }
  let actualDurationDays = null;
  if (project.actualStartDate) {
    const end = project.actualEndDate || new Date();
    actualDurationDays = diffDays(project.actualStartDate, end);
  }
  return {
    ...base,
    plannedDurationDays,
    actualDurationDays,
    tasks: (project.tasks || []).map(shapeTask),
    risks: (project.risks || []).map(shapeRisk),
  };
}

function shapeRisk(risk) {
  const shaped = {
    id: risk.id,
    projectId: risk.projectId,
    title: risk.title,
    description: risk.description,
    probability: risk.probability,
    impact: risk.impact,
    riskScore: risk.riskScore,
    riskLevel: riskLevel(risk.riskScore),
    mitigationPlan: risk.mitigationPlan,
    contingencyPlan: risk.contingencyPlan,
    ownerStakeholderId: risk.ownerStakeholderId,
    owner: risk.owner
      ? { id: risk.owner.id, name: risk.owner.name, email: risk.owner.email }
      : null,
    status: risk.status,
    identifiedDate: risk.identifiedDate,
    resolvedDate: risk.resolvedDate,
    createdAt: risk.createdAt,
    updatedAt: risk.updatedAt,
  };
  if (risk.project) {
    shaped.project = {
      id: risk.project.id,
      projectCode: risk.project.projectCode,
      name: risk.project.name,
    };
  }
  return shaped;
}

function shapeStakeholder(stakeholder) {
  return {
    id: stakeholder.id,
    name: stakeholder.name,
    email: stakeholder.email,
    phone: stakeholder.phone,
    department: stakeholder.department,
    position: stakeholder.position,
    organization: stakeholder.organization,
    createdAt: stakeholder.createdAt,
    updatedAt: stakeholder.updatedAt,
    projectCount: stakeholder._count?.projects ?? 0,
    taskCount: stakeholder._count?.tasks ?? 0,
    riskCount: stakeholder._count?.risks ?? 0,
  };
}

function shapePriority(priority) {
  return {
    id: priority.id,
    name: priority.name,
    level: priority.level,
    description: priority.description,
    color: priority.color,
    taskCount: priority._count?.tasks ?? 0,
  };
}

module.exports = {
  shapeTask,
  shapeProject,
  shapeProjectDetail,
  shapeRisk,
  shapeStakeholder,
  shapePriority,
};
