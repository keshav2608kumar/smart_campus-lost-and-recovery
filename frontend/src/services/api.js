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

// Attach JWT token & anti-cache headers to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Prevent browser caching on dynamic API requests
  config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
  config.headers['Pragma'] = 'no-cache';
  config.headers['Expires'] = '0';

  // Append timestamp parameter to GET requests to guarantee fresh database reads
  if (config.method === 'get') {
    config.params = {
      ...config.params,
      _t: Date.now()
    };
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
