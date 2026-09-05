import api from './api';

export const getBilling = (orderId) => api.get(/orders//billing);
export const getInvoice = (orderId) => api.get(/orders//invoice);
export const submitPayment = (orderId, payload) => api.post(/orders//payment, payload);
