import api from './api';

export const getBilling = (orderId) => api.get(`/orders/${orderId}/billing`);
export const getInvoice = (orderId) => api.get(`/orders/${orderId}/invoice`);
export const submitPayment = (orderId, payload) => api.post(`/orders/${orderId}/payment`, payload);
export const getPayments = (orderId) => api.get(`/orders/${orderId}/payments`);
