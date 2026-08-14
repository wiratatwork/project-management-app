import { api, setToken } from '../api.js';
import { escapeHtml } from '../utils.js';
import { toast } from '../components/ui.js';

export default {
  async mount(container) {
    container.innerHTML = `
      <div class="login-card">
        <div class="brand"><span class="brand-logo"><i class="bi bi-bar-chart"></i></span> ProjectFlow</div>
        <div class="login-sub">Project Management System</div>
        <form id="loginForm" novalidate>
          <div class="form-field" style="margin-bottom:14px">
            <label for="username">Username</label>
            <input type="text" id="username" name="username" value="admin" autocomplete="username" required />
          </div>
          <div class="form-field" style="margin-bottom:20px">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" value="admin123" autocomplete="current-password" required />
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;padding:10px" id="loginBtn">Sign In</button>
        </form>
        <div class="login-hint">Demo credentials: <strong>admin</strong> / <strong>admin123</strong></div>
      </div>`;

    const form = container.querySelector('#loginForm');
    const btn = container.querySelector('#loginBtn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = form.username.value.trim();
      const password = form.password.value;
      btn.disabled = true;
      btn.textContent = 'Signing in…';
      try {
        const data = await api.post('/api/auth/login', { username, password });
        setToken(data.token);
        localStorage.setItem('pm_user', data.user?.username || username);
        toast(`Welcome, ${data.user?.name || username}!`, 'success');
        location.hash = '#/dashboard';
      } catch (err) {
        toast(escapeHtml(err.message), 'error');
        btn.disabled = false;
        btn.textContent = 'Sign In';
      }
    });
  },
};
