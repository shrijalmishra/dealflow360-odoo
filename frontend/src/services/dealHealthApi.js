import api from './api';

export const getDealHealthSummary = async () => {
  const res = await api.get('/deal-health/summary');
  return { success: true, data: res.data || res };
};

export const getDealAlerts = async (params) => {
  const res = await api.get('/deal-health/alerts', { params });
  const alerts = res.alerts || res.data?.alerts || (Array.isArray(res.data) ? res.data : []);
  return { success: true, data: alerts, ...alerts };
};

export const getQuotationHealth = async (quotationId) => {
  const res = await api.get(`/deal-health/quotations/${quotationId}`);
  return { success: true, data: res.assessment || res.data || res };
};

export const refreshQuotationHealth = async (quotationId) => {
  const res = await api.post(`/deal-health/quotations/${quotationId}/refresh`);
  return { success: true, data: res.assessment || res.data || res };
};

export const acknowledgeAlert = async (alertId) => {
  const res = await api.patch(`/deal-health/alerts/${alertId}/acknowledge`);
  return res;
};

export const resolveAlert = async (alertId) => {
  const res = await api.patch(`/deal-health/alerts/${alertId}/resolve`);
  return res;
};
