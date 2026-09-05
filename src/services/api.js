import axios from 'axios';

// Central API Client
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dealflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor for common error handling
api.interceptors.response.use(
  (response) => {
    // Return the response data directly (which contains { success, data })
    return response.data;
  },
  (error) => {
    // Format error to match the required standard error shape if it's not already
    const formattedError = error.response?.data || {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Could not connect to the server.'
      }
    };
    return Promise.reject(formattedError);
  }
);

export default api;
