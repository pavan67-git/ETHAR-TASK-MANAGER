// ========================================
// API Client — Handles all HTTP requests
// ========================================

const API_BASE = window.location.origin + '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  getHeaders() {
    const h = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  }

  async request(method, path, body = null) {
    const opts = { method, headers: this.getHeaders() };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      this.clearToken();
      if (!window.location.pathname.match(/^\/$|\/index\.html$/)) {
        window.location.href = '/';
      }
      throw new Error(data.error || 'Session expired');
    }

    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  get(path)          { return this.request('GET', path); }
  post(path, body)   { return this.request('POST', path, body); }
  patch(path, body)  { return this.request('PATCH', path, body); }
  put(path, body)    { return this.request('PUT', path, body); }
  delete(path)       { return this.request('DELETE', path); }
}

const api = new ApiClient();
