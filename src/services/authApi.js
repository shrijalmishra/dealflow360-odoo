import api from './api';

export const login = (email, password) => api.post('/auth/login', { email, password });
export const signup = (userData) => api.post('/auth/signup', userData);
export const me = () => api.get('/auth/me');
