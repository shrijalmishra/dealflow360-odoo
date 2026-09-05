import api from './api';

export const getQuotes = () => api.get('/quotes');
export const getQuoteById = (id) => api.get(/quotes/);
export const recalculateQuote = (id, payload) => api.post(/quotes//recalculate, payload);
export const getRecommendations = (id) => api.get(/quotes//recommendations);
export const confirmQuote = (id) => api.post(/quotes//confirm);
