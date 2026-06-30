import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// ── Inject JWT token ke setiap request ──────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Handle 401 global (token expired / invalid) ──────────────────────────────
// 401 = token invalid/expired → logout. 403 = token valid tapi user tak punya
// akses ke endpoint ini → JANGAN logout, biarkan caller handle (toast/redirect).
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Avoid redirect loop on login page
      if (window.location.pathname === '/login') {
        return Promise.reject(err);
      }
      localStorage.removeItem('auth_token');
      // Redirect to login page
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;