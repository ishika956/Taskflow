import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Attach JWT + socket ID to every request
api.interceptors.request.use((config) => {
  const token    = localStorage.getItem('token');
  const socketId = window.__socketId ?? null;

  if (token)    config.headers['Authorization']  = `Bearer ${token}`;
  if (socketId) config.headers['x-socket-id']    = socketId;

  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
