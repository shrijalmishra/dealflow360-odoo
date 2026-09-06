import api from './api';

export const getWarehouses = async () => {
  const res = await api.get('/warehouses');
  // Backend returns: { warehouses: [...] }
  const list = res.warehouses || res.data?.warehouses || (Array.isArray(res.data) ? res.data : []);
  return { success: true, data: list };
};

export const getWarehouseById = async (id) => {
  const res = await api.get(`/warehouses/${id}`);
  return { success: true, data: res.warehouse || res.data || res };
};

export const getProductInventory = async (productId) => {
  const res = await api.get(`/warehouses/inventory/product/${productId}`);
  return { success: true, data: res.inventory || res.data || [] };
};

export const getQuotationAllocation = async (quotationId) => {
  const res = await api.get(`/warehouses/allocation/quotation/${quotationId}`);
  const plan = res.plan || res.data?.plan || res.data || {};
  return { success: true, data: plan };
};

export const createQuotationFulfillment = async (quotationId, payload) => {
  return api.post(`/warehouses/fulfillment/quotation/${quotationId}`, payload);
};
