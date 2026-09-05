import api from './api';

export const getApprovals = () => api.get('/approvals');
export const getQuoteApproval = (id) => api.get(/quotes//approval);
export const submitAction = (id, payload) => api.post(/quotes//approval/action, payload);
