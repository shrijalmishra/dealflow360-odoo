import api from './api';

export const login = (email, password) => api.post('/auth/login', { email, password });
export const signup = (userData) => api.post('/auth/signup', userData);
export const customerLogin = (email, password) => api.post('/auth/customer-login', { email, password });
export const customerRegister = (data) => api.post('/auth/customer-register', data);

export const me = async () => {
  // Check cached user first
  const storedUser = localStorage.getItem('dealflow_user');
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      return { success: true, data: user, ...user };
    } catch (e) {
      // parse error, continue to token decode
    }
  }

  const token = localStorage.getItem('dealflow_token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const user = {
      id: payload.userId || payload.sub || 'user-id',
      name: payload.email ? payload.email.split('@')[0] : 'User',
      email: payload.email,
      role: payload.role || 'SALES_REP',
    };
    localStorage.setItem('dealflow_user', JSON.stringify(user));
    return { success: true, data: user, ...user };
  } catch (e) {
    throw new Error('Invalid token');
  }
};
