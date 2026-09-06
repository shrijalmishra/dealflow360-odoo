import api from './api';

export const getCustomers = async () => {
  const res = await api.get('/customers');
  const list = res.customers || res.data?.customers || (Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []));
  return { success: true, data: list, ...list };
};

export const getCustomerTiers = async () => {
  const res = await api.get('/customers/tiers');
  const list = res.tiers || res.data?.tiers || (Array.isArray(res.data) ? res.data : []);
  return { success: true, data: list, ...list };
};

export const getCustomerById = async (id) => {
  const res = await api.get(`/customers/${id}`);
  return { success: true, data: res.customer || res.data || res };
};

export const createCustomer = async (data) => {
  const res = await api.post('/customers', data);
  return res;
};
