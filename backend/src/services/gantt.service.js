const AppError = require('../utils/AppError');
const projectRepository = require('../repositories/project.repository');
const taskRepository = require('../repositories/task.repository');
const { shapeProject, shapeTask } = require('./shapers');

class GanttService {
  /**
   * Return everything the Gantt chart needs for one project:
   * project summary + tasks with planned/actual timelines, progress,
   * priorities, stakeholders and dependencies.
   */
  async getProjectGantt(projectId) {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new AppError('Project not found', { code: 'NOT_FOUND', statusCode: 404 });
    }
    const tasks = await taskRepository.findManyByProject(projectId);
    return this.buildProjectGantt(project, tasks);
  }

  /**
   * Everything the global (all-projects) Gantt page needs in one call:
   * every project with its tasks + schedule, plus a cross-project summary.
   */
  async getAllGantt() {
    const projects = await projectRepository.findAll();
    const schedule = { ON_TRACK: 0, AT_RISK: 0, DELAYED: 0 };

    const groups = await Promise.all(
      projects.map(async (project) => {
        const tasks = await taskRepository.findManyByProject(project.id);
        const group = this.buildProjectGantt(project, tasks);
        schedule.ON_TRACK += group.schedule.ON_TRACK;
        schedule.AT_RISK += group.schedule.AT_RISK;
        schedule.DELAYED += group.schedule.DELAYED;
        return group;
      })
    );

    return { projects: groups, schedule };
  }

  buildProjectGantt(project, tasks) {
    const shapedTasks = tasks.map(shapeTask);

    // Schedule health summary for the project's task list.
    const schedule = shapedTasks.reduce(
      (acc, t) => {
        acc[t.scheduleStatus] += 1;
        return acc;
      },
      { ON_TRACK: 0, AT_RISK: 0, DELAYED: 0 }
    );

    return {
      project: shapeProject(project),
      tasks: shapedTasks,
      schedule,
    };
  }
}

module.exports = new GanttService();
