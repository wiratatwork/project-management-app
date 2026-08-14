// Minimal REST client. All calls go to the same origin (/api), which nginx
// proxies to the backend container. For host-only development, set
// window.API_BASE to the backend URL (CORS is enabled on the backend).

const TOKEN_KEY = 'pm_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function base() {
  return window.API_BASE || '';
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${base()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (networkError) {
    throw new Error('Cannot reach the API server. Is the backend running?');
  }

  let json = null;
  try {
    json = await res.json();
  } catch {
    // non-JSON response
  }

  if (!res.ok) {
    const message = json?.error?.message || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.code = json?.error?.code;
    err.details = json?.error?.details || [];
    if (res.status === 401 && !path.startsWith('/api/auth/')) {
      setToken(null);
      if (location.hash !== '#/login') location.hash = '#/login';
    }
    throw err;
  }

  return json?.data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  del: (path) => request('DELETE', path),
};
