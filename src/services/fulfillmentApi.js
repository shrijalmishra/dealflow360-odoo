import api from './api';

export const getRecommendation = (orderId) => api.get(/orders//fulfillment/recommendation);
export const acceptSplit = (orderId, payload) => api.post(/orders//fulfillment/accept, payload);
export const updateFulfillment = (orderId, payload) => api.put(/orders//fulfillment, payload);
export const consolidateBackorder = (orderId) => api.post(/orders//fulfillment/consolidate);
