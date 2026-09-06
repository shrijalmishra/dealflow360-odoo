import axios from 'axios';

// Central API Client
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach auth token
api.interceptors.request.use((config) => {
  // If authorization header is already provided on the request, keep it!
  if (!config.headers.Authorization) {
    const isPortal = config.url && (config.url.startsWith('/portal') || config.url.includes('/customer'));
    const token = isPortal
      ? (localStorage.getItem('dealflow_customer_token') || localStorage.getItem('dealflow_token'))
      : (localStorage.getItem('dealflow_token') || localStorage.getItem('dealflow_customer_token'));
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor for common error handling and format normalization
api.interceptors.response.use(
  (response) => {
    // If already enveloped with { data: ... }
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return response.data;
    }
    // Wrap backend response so res.data is always the response payload
    return {
      success: true,
      data: response.data,
      ...(response.data && typeof response.data === 'object' && !Array.isArray(response.data) ? response.data : {})
    };
  },
  (error) => {
    // Format error to match the required standard error shape if it's not already
    const backendMsg = error.response?.data?.error?.message 
      || error.response?.data?.message 
      || error.response?.data?.error
      || (typeof error.response?.data === 'string' ? error.response.data : null)
      || 'Request failed';

    const formattedError = {
      success: false,
      error: {
        code: error.response?.data?.error?.code || error.response?.status || 'API_ERROR',
        message: backendMsg
      }
    };
    return Promise.reject(formattedError);
  }
);

export default api;
