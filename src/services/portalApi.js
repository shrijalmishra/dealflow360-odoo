import api from './api';

export const getQuote = (token) => api.get(/portal/quotes/);
export const submitNegotiation = (token, payload) => api.post(/portal/quotes//negotiations, payload);
export const confirmQuote = (token) => api.post(/portal/quotes//confirm);
