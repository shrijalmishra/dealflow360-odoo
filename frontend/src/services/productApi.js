import api from './api';

export const getProducts = async () => {
  const res = await api.get('/products');
  const products = res.products || res.data?.products || (Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []));
  const normalized = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    type: p.lineType || p.type || 'ONE_TIME',
    price: p.basePrice || p.price || 0,
    basePrice: p.basePrice || p.price || 0,
    costPrice: p.costPrice || 0,
    margin: p.basePrice && p.costPrice ? Math.round(((p.basePrice - p.costPrice) / p.basePrice) * 100) : 25,
    category: p.category?.name || 'Hardware',
  }));
  return { success: true, data: normalized, ...normalized };
};

export const getProductById = (id) => api.get(`/products/${id}`);
export const createProduct = (payload) => api.post('/products', payload);
export const updateProduct = (id, payload) => api.put(`/products/${id}`, payload);
export const deleteProduct = (id) => api.delete(`/products/${id}`);

export const getCategories = async () => {
  const res = await api.get('/products/categories');
  return res.categories || res.data?.categories || [];
};

export const getVariants = async (productId) => {
  const res = await api.get(`/products/${productId}/variants`);
  return res.variants || res.data?.variants || [];
};

export const createVariant = (productId, payload) => api.post(`/products/${productId}/variants`, payload);

export const getPriceLists = async () => {
  const res = await api.get('/products/price-lists');
  return res.priceLists || res.data?.priceLists || [];
};

export const createPriceListEntry = (payload) => api.post('/products/price-lists', payload);

export const deletePriceListEntry = (id) => api.delete(`/products/price-lists/${id}`);

export const getRawProducts = async () => {
  const res = await api.get('/products');
  return res.products || res.data?.products || [];
};
