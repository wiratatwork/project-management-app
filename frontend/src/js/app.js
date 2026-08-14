import { getToken, setToken } from './api.js';
import { getCurrentRoute } from './router.js';
import { escapeHtml } from './utils.js';
import { breadcrumbBarHTML, bindBreadcrumbs } from './components/breadcrumbs.js';

const root = document.getElementById('app');

const THEME_KEY = 'pm_theme';

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  const toggle = document.getElementById('themeToggle');
  if (toggle) toggle.innerHTML = theme === 'dark' ? '<i class="bi bi-sun"></i>' : '<i class="bi bi-moon-stars"></i>';
  document.querySelectorAll('.theme-menu button').forEach((b) => {
    b.classList.toggle('active', b.dataset.themeChoice === theme);
  });
}

// Apply stored theme early to avoid a flash of the wrong theme.
applyTheme(localStorage.getItem(THEME_KEY) || 'light');

const NAV_ITEMS = [
  { href: '#/dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
  { href: '#/projects', label: 'Projects', icon: 'bi-folder' },
  { href: '#/gantt', label: 'Gantt', icon: 'bi-calendar3' },
  { href: '#/stakeholders', label: 'Stakeholders', icon: 'bi-people' },
  { href: '#/priorities', label: 'Priorities', icon: 'bi-tags' },
  { href: '#/risks', label: 'Risks', icon: 'bi-exclamation-triangle' },
];

function renderLoginShell() {
  return `<div class="login-wrap"></div>`;
}

function renderAppShell() {
  const nav = NAV_ITEMS.map(
    (item) => `<a class="nav-item" href="${item.href}" data-nav="${item.href}">
      <span class="nav-icon"><i class="bi ${item.icon}"></i></span><span>${item.label}</span>
    </a>`
  ).join('');

  return `
    <header class="app-header">
      <button class="icon-btn sidebar-toggle" id="sidebarToggle" aria-label="Toggle menu"><i class="bi bi-list"></i></button>
      <div class="brand"><span class="brand-logo"><i class="bi bi-bar-chart"></i></span> ProjectFlow</div>
      <div class="header-right">
        <a class="header-link" href="/api-docs" target="_blank" rel="noopener">API Docs</a>
        <span class="header-user"><i class="bi bi-person"></i> <span id="currentUser">admin</span></span>
        <div class="theme-menu-wrap">
          <button class="icon-btn theme-toggle" id="themeToggle" aria-label="Switch theme" title="Switch theme"><i class="bi bi-moon-stars"></i></button>
          <div class="theme-menu" id="themeMenu" hidden>
            <button type="button" data-theme-choice="light"><i class="bi bi-sun"></i> Light</button>
            <button type="button" data-theme-choice="dark"><i class="bi bi-moon-stars"></i> Dark</button>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" id="logoutBtn"><i class="bi bi-box-arrow-right"></i> Logout</button>
      </div>
    </header>
    <div class="layout" id="layout">
      <aside class="sidebar" id="sidebar">
        <nav class="nav">${nav}</nav>
        <div class="sidebar-footer">
          <div class="sidebar-footnote">Project Management System</div>
        </div>
      </aside>
      <main class="main" id="main"></main>
    </div>
  `;
}

async function renderPage() {
  const route = getCurrentRoute();
  const token = getToken();

  // Auth guard
  if (!token && route.name !== 'login') {
    location.hash = '#/login';
    return;
  }
  if (token && route.name === 'login') {
    location.hash = '#/dashboard';
    return;
  }

  if (route.name === 'login') {
    root.innerHTML = renderLoginShell();
    const loginWrap = root.querySelector('.login-wrap');
    const { default: LoginPage } = await import('./pages/LoginPage.js');
    await LoginPage.mount(loginWrap);
    return;
  }

  root.innerHTML = renderAppShell();
  highlightNav(route);

  document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('layout').classList.toggle('sidebar-open');
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    setToken(null);
    location.hash = '#/login';
  });

  // Theme menu (top-right)
  applyTheme(localStorage.getItem(THEME_KEY) || 'light');
  const themeToggle = document.getElementById('themeToggle');
  const themeMenu = document.getElementById('themeMenu');
  themeToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    themeMenu.hidden = !themeMenu.hidden;
  });
  themeMenu.addEventListener('click', (e) => {
    const choice = e.target.closest('[data-theme-choice]');
    if (!choice) return;
    applyTheme(choice.dataset.themeChoice);
    themeMenu.hidden = true;
  });

  const stored = localStorage.getItem('pm_user');
  if (stored) document.getElementById('currentUser').textContent = stored;

  const main = document.getElementById('main');
  main.innerHTML = `
    ${breadcrumbBarHTML(route)}
    <div class="page-body" id="pageBody"><div class="page-loading">Loading…</div></div>
  `;
  bindBreadcrumbs(route);

  const body = document.getElementById('pageBody');
  try {
    const { default: Page } = await import(`./pages/${route.page}.js`);
    await Page.mount(body, route.params || {});
  } catch (err) {
    console.error(err);
    body.innerHTML = `
      <div class="page-error">
        <h2>Something went wrong</h2>
        <p>${escapeHtml(err.message || 'Unknown error')}</p>
        <button class="btn btn-primary" onclick="location.hash='#/dashboard'">Go to Dashboard</button>
      </div>`;
  }
}

function highlightNav(route) {
  const map = {
    dashboard: '#/dashboard',
    projects: '#/projects',
    projectDetail: '#/projects',
    gantt: '#/gantt',
    stakeholders: '#/stakeholders',
    priorities: '#/priorities',
    risks: '#/risks',
  };
  const active = map[route.name];
  document.querySelectorAll('.nav-item').forEach((a) => {
    a.classList.toggle('active', a.dataset.nav === active);
  });
}

// Close the theme menu when clicking anywhere outside it.
document.addEventListener('click', (e) => {
  if (!e.target.closest || e.target.closest('.theme-menu-wrap')) return;
  const menu = document.getElementById('themeMenu');
  if (menu) menu.hidden = true;
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const menu = document.getElementById('themeMenu');
    if (menu) menu.hidden = true;
  }
});

window.addEventListener('hashchange', renderPage);
window.addEventListener('DOMContentLoaded', renderPage);
renderPage();
