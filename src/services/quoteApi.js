import api from './api';

export const getQuotes = () => api.get('/quotes');
export const getQuoteById = (id) => api.get(`/quotes/${id}`);
export const createQuote = (payload) => api.post('/quotes', payload);
export const updateQuote = (id, payload) => api.put(`/quotes/${id}`, payload);
export const deleteQuote = (id) => api.delete(`/quotes/${id}`);
export const addLine = (id, payload) => api.post(`/quotes/${id}/lines`, payload);
export const updateLine = (id, lineId, payload) => api.put(`/quotes/${id}/lines/${lineId}`, payload);
export const removeLine = (id, lineId) => api.delete(`/quotes/${id}/lines/${lineId}`);
export const recalculateQuote = (id, payload) => api.post(`/quotes/${id}/recalculate`, payload);
export const getRecommendations = (id) => api.get(`/quotes/${id}/recommendations`);
export const confirmQuote = (id) => api.post(`/quotes/${id}/confirm`);
