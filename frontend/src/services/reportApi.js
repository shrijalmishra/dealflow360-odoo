import api from './api';

export const getReports = async (params) => {
  const [dashRes, prodsRes] = await Promise.all([
    api.get('/reporting/dashboard', { params }),
    api.get('/products').catch(() => ({ products: [] })),
  ]);

  const d = dashRes.data || dashRes;
  const exec = d.executiveSummary || d.kpis || {};
  const apprv = d.approvalPipeline || d.approvalsSummary || {};
  const discount = d.discountAndRiskAnalytics || {};
  const upsell = d.upsellCrossSellImpact || {};
  const billing = d.billingAndCollections || {};
  const prods = prodsRes.products || prodsRes.data?.products || (Array.isArray(prodsRes.data) ? prodsRes.data : []);

  const catalogProducts = prods.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku || 'N/A',
    category: p.category?.name || 'Standard',
    basePrice: p.basePrice || 0,
  }));

  const normalized = {
    quotationCount: exec.totalQuotations || 0,
    orderCount: exec.dealsWonCount || 0,
    revenue: exec.realizedRevenue || exec.pipelineNetValue || 0,
    averageDiscount: discount.overallAvgDiscountPct || discount.avgDiscountPctAcrossQuotes || 0,
    approvalStats: {
      approved: apprv.approved || 0,
      rejected: apprv.rejected || 0,
      pending: apprv.pending || 0,
      returned: apprv.returned || 0,
    },
    upsellImpact: {
      acceptedCount: upsell.recommendationsAcceptedCount || 0,
      revenue: upsell.recommendationRevenue || 0,
      attachRatePct: upsell.attachRatePct || 0,
      quotesWithRecommendations: upsell.quotesWithRecommendations || 0,
    },
    billingSummary: {
      invoiced: billing.totalInvoiced || 0,
      collected: billing.totalCollected || 0,
      outstanding: billing.totalOutstanding || 0,
    },
    catalogProducts,
  };

  return { success: true, data: normalized, ...normalized };
};

export const exportQuotationsCSV = async () => {
  const token = localStorage.getItem('dealflow_token');
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

  const res = await fetch(`${baseUrl}/reporting/export/quotations.csv`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.message || `CSV Export Failed (${res.status})`);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dealflow360-quotations-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

export const exportQuotationsXLS = async () => {
  const token = localStorage.getItem('dealflow_token');
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

  const res = await fetch(`${baseUrl}/reporting/export/quotations.xls`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.message || `XLS Export Failed (${res.status})`);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dealflow360-quotations-report-${new Date().toISOString().slice(0, 10)}.xls`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

export const exportQuotationsPDF = async () => {
  const token = localStorage.getItem('dealflow_token');
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

  const res = await fetch(`${baseUrl}/reporting/export/quotations.pdf`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.message || `PDF Export Failed (${res.status})`);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dealflow360-quotations-report-${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};
