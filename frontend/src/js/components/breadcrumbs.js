// Shared breadcrumb bar + Back button, injected above every app page by app.js.
// Single component reused across the whole system — pages only fill in dynamic
// crumb labels (e.g. the project name on the project detail page).

import { escapeHtml, STATUS_COLORS } from '../utils.js';
import { api } from '../api.js';

// Trail for each route. `href` is the second-level crumb (null for Dashboard,
// which is the root). The last crumb is always the current page.
const PAGE_CRUMBS = {
  dashboard: { label: 'Dashboard', href: null },
  projects: { label: 'Projects', href: '#/projects' },
  projectDetail: { label: 'Projects', href: '#/projects' },
  gantt: { label: 'Gantt Chart', href: '#/gantt' },
  stakeholders: { label: 'Stakeholders', href: '#/stakeholders' },
  priorities: { label: 'Priorities', href: '#/priorities' },
  risks: { label: 'Risks', href: '#/risks' },
};

// Where the Back button goes — one level up the app tree (never leaves the app).
const BACK_TARGET = {
  projects: '#/dashboard',
  projectDetail: '#/projects',
  gantt: '#/dashboard',
  stakeholders: '#/dashboard',
  priorities: '#/dashboard',
  risks: '#/dashboard',
};

export function breadcrumbBarHTML(route) {
  const page = PAGE_CRUMBS[route.name];
  if (!page) return '';
  const backTarget = BACK_TARGET[route.name];
  const back = backTarget
    ? `<button type="button" class="icon-btn crumb-back" id="crumbBackBtn" data-back="${backTarget}" title="Back" aria-label="Back"><i class="bi bi-arrow-left"></i></button>`
    : '';
  let trail;
  if (route.name === 'projectDetail') {
    // Home / Projects ▾ / <project name> — the Projects crumb is a dropdown
    // that jumps straight to any project (current one is highlighted).
    trail = `
      <a class="crumb-link" href="#/dashboard"><i class="bi bi-house-door"></i> Home</a>
      <span class="crumb-sep" aria-hidden="true">/</span>
      <div class="crumb-dropdown" id="crumbProjectsDD">
        <button type="button" class="crumb-link crumb-dd-trigger" id="crumbProjectsBtn" aria-haspopup="true" aria-expanded="false">
          ${escapeHtml(page.label)} <i class="bi bi-chevron-down crumb-dd-caret"></i>
        </button>
        <div class="crumb-dd-menu" id="crumbProjectsMenu" hidden>
          <div class="crumb-dd-search">
            <i class="bi bi-search"></i>
            <input type="text" id="crumbProjectsSearch" placeholder="Search projects..." autocomplete="off" />
          </div>
          <div class="crumb-dd-list" id="crumbProjectsList"></div>
        </div>
      </div>
      <span class="crumb-sep" aria-hidden="true">/</span>
      <span class="crumb-current" id="crumbCurrent">…</span>`;
  } else if (page.href) {
    // Top-level page: Home / <current page>
    trail = `
      <a class="crumb-link" href="#/dashboard"><i class="bi bi-house-door"></i> Home</a>
      <span class="crumb-sep" aria-hidden="true">/</span>
      <span class="crumb-current">${escapeHtml(page.label)}</span>`;
  } else {
    // Dashboard is the root.
    trail = `<span class="crumb-current"><i class="bi bi-house-door"></i> ${escapeHtml(page.label)}</span>`;
  }
  return `<div class="crumb-bar">${back}<nav class="crumbs" aria-label="Breadcrumb">${trail}</nav></div>`;
}

export function bindBreadcrumbs(route) {
  const back = document.getElementById('crumbBackBtn');
  if (back) {
    back.addEventListener('click', () => {
      const target = back.dataset.back;
      if (target) location.hash = target;
    });
  }
  bindProjectsDropdown(route);
}

// ---- Projects dropdown on the project-detail breadcrumb ---------------------

let projectsCache = { list: null, at: 0 };
const PROJECTS_TTL = 30000; // refetch at most every 30s so new/renamed projects show up

async function loadProjects() {
  if (projectsCache.list && Date.now() - projectsCache.at < PROJECTS_TTL) return projectsCache.list;
  const res = await api.get('/api/projects');
  const list = Array.isArray(res) ? res : res.rows || [];
  projectsCache = { list, at: Date.now() };
  return list;
}

function bindProjectsDropdown(route) {
  const dd = document.getElementById('crumbProjectsDD');
  if (!dd) return;
  const btn = document.getElementById('crumbProjectsBtn');
  const menu = document.getElementById('crumbProjectsMenu');
  const list = document.getElementById('crumbProjectsList');
  const search = document.getElementById('crumbProjectsSearch');
  const currentId = Number(route.params?.id);

  const close = () => {
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  };
  const open = async () => {
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    search.value = '';
    search.focus();
    try {
      await renderList('');
    } catch (err) {
      list.innerHTML = `<div class="crumb-dd-empty">Failed to load projects</div>`;
    }
  };
  const renderList = async (q) => {
    const projects = await loadProjects();
    const needle = q.trim().toLowerCase();
    const rows = projects.filter(
      (p) => !needle || `${p.name} ${p.projectCode}`.toLowerCase().includes(needle)
    );
    if (rows.length === 0) {
      list.innerHTML = `<div class="crumb-dd-empty">No projects found</div>`;
      return;
    }
    list.innerHTML = rows
      .map((p) => {
        const active = Number(p.id) === currentId;
        const color = STATUS_COLORS[p.status] || '#64748b';
        return `<button type="button" class="crumb-dd-row${active ? ' active' : ''}" data-id="${p.id}">
          <span class="crumb-dd-dot" style="background:${color}"></span>
          <span class="crumb-dd-name">${escapeHtml(p.name)}</span>
          <span class="crumb-dd-code">${escapeHtml(p.projectCode)}</span>
          ${active ? '<i class="bi bi-check2 crumb-dd-check"></i>' : ''}
        </button>`;
      })
      .join('');
  };

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (menu.hidden) open();
    else close();
  });
  search.addEventListener('input', () => renderList(search.value));
  list.addEventListener('click', (e) => {
    const row = e.target.closest('.crumb-dd-row');
    if (!row) return;
    close();
    location.hash = `#/projects/${row.dataset.id}`;
  });
  document.addEventListener('click', (e) => {
    if (!menu.hidden && !e.target.closest('#crumbProjectsDD')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) close();
  });
}

// Filled in by the page once it has the real data (project detail name).
export function setCrumbCurrent(label) {
  const el = document.getElementById('crumbCurrent');
  if (el) el.textContent = label;
}
