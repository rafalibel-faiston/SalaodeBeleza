import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request: anexa o token JWT se existir ───────────────────────────────────
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response: em 401, limpa token e avisa o painel para redirecionar ────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('admin_token');
      // Dispara evento global — o AdminDashboard ouve e mostra login novamente
      window.dispatchEvent(new Event('admin-session-expired'));
    }
    return Promise.reject(error);
  }
);

export default api;
