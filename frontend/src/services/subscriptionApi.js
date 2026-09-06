import api from './api';

export const getSubscriptions = async () => {
  const res = await api.get('/subscriptions');
  const list = res.subscriptions || res.data?.subscriptions || (Array.isArray(res.data) ? res.data : []);
  return { success: true, data: list, subscriptions: list };
};

export const getSubscriptionById = async (id) => {
  const res = await api.get(`/subscriptions/${id}`);
  return { success: true, data: res.subscription || res.data || res };
};

export const createSubscription = async (data) => {
  const res = await api.post('/subscriptions', data);
  return res;
};

export const cancelSubscription = async (id) => {
  const res = await api.post(`/subscriptions/${id}/cancel`);
  return res;
};
