import api from './api';

export const getQuote = (token) => api.get(`/portal/quotes/${token}`);
export const submitNegotiation = (token, payload) => api.post(`/portal/quotes/${token}/negotiations`, payload);
export const confirmQuote = (token) => api.post(`/portal/quotes/${token}/confirm`);
