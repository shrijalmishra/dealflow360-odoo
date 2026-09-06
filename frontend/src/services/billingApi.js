import api from './api';

export const getBilling = async (orderOrQuotationId) => {
  if (!orderOrQuotationId) throw new Error('No ID provided.');
  const res = await api.get('/billing');
  const invoices = res.invoices || res.data?.invoices || (Array.isArray(res.data) ? res.data : []);
  const inv = invoices.find(i => i.id === orderOrQuotationId || i.quotationId === orderOrQuotationId);
  if (!inv) throw new Error(`No invoice for "${orderOrQuotationId}". Generate one from the quotation first.`);
  const total = Number(inv.total || inv.totalAmount || 0);
  const payments = inv.payments || [];
  const paid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const remaining = Math.max(0, total - paid);
  const lines = (inv.lines || []).map((item, idx) => ({
    id: item.id || `inv-line-${idx}`,
    product: item.description || 'Invoice Item',
    quantity: 1,
    amount: Number(item.amount || 0),
    billingDate: inv.createdAt,
    status: inv.status,
  }));
  return {
    success: true,
    data: { invoiceId: inv.id, quotationId: inv.quotationId,
      invoiceNumber: 'INV-' + inv.id.substring(0, 8).toUpperCase(),
      total, paid, remaining, invoiceStatus: inv.status, payments, oneTime: lines, recurring: [] }
  };
};

export const listAllInvoices = async () => {
  const res = await api.get('/billing');
  const invoices = res.invoices || res.data?.invoices || (Array.isArray(res.data) ? res.data : []);
  return invoices.map(inv => {
    const total = Number(inv.total || inv.totalAmount || 0);
    const payments = inv.payments || [];
    const paid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    return {
      id: inv.id,
      invoiceNumber: 'INV-' + inv.id.substring(0, 8).toUpperCase(),
      quotationId: inv.quotationId,
      customerName: inv.quotation?.customer?.name || inv.customer?.name || '—',
      total, paid, remaining: Math.max(0, total - paid),
      status: inv.status,
      createdAt: inv.createdAt,
    };
  });
};

export const submitPayment = async (orderOrQuotationId, payload) => {
  const res = await api.get('/billing');
  const invoices = res.invoices || res.data?.invoices || (Array.isArray(res.data) ? res.data : []);
  const inv = invoices.find(i => i.id === orderOrQuotationId || i.quotationId === orderOrQuotationId);
  if (!inv) throw new Error(`No matching invoice for "${orderOrQuotationId}".`);
  return api.post(`/billing/invoices/${inv.id}/payments`, {
    amount: Number(payload.amount),
    method: payload.paymentMethod || payload.method || 'BANK_TRANSFER',
  });
};

export const createInvoice = async (quotationId) => api.post(`/billing/quotation/${quotationId}/one-time`);
