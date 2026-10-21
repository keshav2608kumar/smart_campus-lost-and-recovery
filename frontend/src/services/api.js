import axios from 'axios';

const envBase = import.meta.env.VITE_API_BASE_URL;
const isPlaceholder = !envBase || envBase.includes('<') || envBase.includes('AAPKA') || envBase === '/api/v1';
const baseURL = isPlaceholder
  ? 'https://smart-campus-lost-and-recovery.onrender.com/api/v1'
  : envBase;

const api = axios.create({
  baseURL: baseURL,
  timeout: 45000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear token and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
