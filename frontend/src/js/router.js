// Hash-based router: #/dashboard, #/projects, #/projects/5, #/tasks, ...

const ROUTE_PAGES = {
  login: 'LoginPage',
  dashboard: 'DashboardPage',
  projects: 'ProjectsPage',
  projectDetail: 'ProjectDetailPage',
  gantt: 'GanttPage',
  stakeholders: 'StakeholdersPage',
  priorities: 'PrioritiesPage',
  risks: 'RisksPage',
};

export function getCurrentRoute() {
  const hash = location.hash || '#/dashboard';
  const segments = hash.replace(/^#\/?/, '').split('/').filter(Boolean);

  if (segments.length === 0) return { name: 'dashboard', page: 'DashboardPage', params: {} };
  if (segments[0] === 'login') return { name: 'login', page: 'LoginPage', params: {} };

  const key = segments.join('/');
  if (key === 'projects' || key === 'projects/') {
    return { name: 'projects', page: 'ProjectsPage', params: {} };
  }
  if (segments[0] === 'projects' && segments.length === 2) {
    return { name: 'projectDetail', page: 'ProjectDetailPage', params: { id: segments[1] } };
  }
  if (segments[0] === 'gantt') return { name: 'gantt', page: 'GanttPage', params: {} };
  if (segments[0] === 'stakeholders') return { name: 'stakeholders', page: 'StakeholdersPage', params: {} };
  if (segments[0] === 'priorities') return { name: 'priorities', page: 'PrioritiesPage', params: {} };
  if (segments[0] === 'risks') return { name: 'risks', page: 'RisksPage', params: {} };

  // Unknown route -> dashboard
  return { name: 'dashboard', page: 'DashboardPage', params: {} };
}

export function navigate(path) {
  location.hash = `#/${path}`;
}

export const pageModuleFor = (route) => ROUTE_PAGES[route.name] || 'DashboardPage';
