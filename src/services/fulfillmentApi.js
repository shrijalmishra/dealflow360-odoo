import api from './api';

export const getRecommendation = (orderId) => api.get(`/orders/${orderId}/fulfillment/recommendation`);
export const acceptSplit = (orderId, payload) => api.post(`/orders/${orderId}/fulfillment/accept`, payload);
export const updateFulfillment = (orderId, payload) => api.put(`/orders/${orderId}/fulfillment`, payload);
export const consolidateBackorder = (orderId) => api.post(`/orders/${orderId}/fulfillment/consolidate`);
