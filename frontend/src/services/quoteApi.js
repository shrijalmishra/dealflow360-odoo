import api from './api';

export const getQuotes = async () => {
  const res = await api.get('/reporting/quotations');
  const list = res.quotations || res.data?.quotations || (Array.isArray(res.data) ? res.data : []);
  const normalized = list.map((q) => ({
    id: q.id,
    quoteNumber: q.quoteNumber || 'QT-' + q.id.substring(0, 8).toUpperCase(),
    customerName: q.customerName,
    customerTier: q.customerTier,
    grandTotal: q.netTotal || q.grossTotal || 0,
    status: q.status,
    riskLevel: q.riskLevel || 'LOW',
    approval: {
      status: q.approvalStatus || 'NOT_REQUIRED',
      requiredLevel: q.riskLevel === 'HIGH' ? 'FINANCE_OPS' : (q.riskLevel === 'MEDIUM' ? 'SALES_MANAGER' : 'NONE'),
    },
    created: q.createdAt,
    updated: q.lastActivityAt || q.createdAt,
    assignedRep: q.repName || 'Sales Rep',
  }));
  return { success: true, data: normalized, ...normalized };
};

export const getQuoteById = async (id) => {
  const res = await api.get(`/quotations/${id}`);
  const q = res.quotation || res.data?.quotation || res.data || res;
  
  // Prefer authoritative backend totals from the backend endpoint
  let authoritativeTotals = null;
  if (id && id !== 'new' && !id.startsWith('new-')) {
    try {
      const totalsRes = await api.get(`/quotations/${id}/totals`);
      authoritativeTotals = totalsRes.quotation || totalsRes.data?.quotation || totalsRes.data || totalsRes;
    } catch (e) {
      // If totals query unavailable, compute from persisted lines below
    }
  }

  // Sort versions descending to pick latest
  const versions = (q.versions || []).slice().sort((a, b) => b.versionNumber - a.versionNumber);
  const latestVersion = versions[0];
  const rawLines = latestVersion?.lines || q.lines || [];

  const lines = rawLines.map((line, idx) => {
    const unitPrice = Number(line.unitPrice || line.product?.basePrice || 0);
    const qty = Number(line.quantity || 1);
    const discPct = Number(line.discountPct || line.discountPercent || 0);
    const gross = unitPrice * qty;
    const discAmt = line.discountAmount != null ? Number(line.discountAmount) : gross * (discPct / 100);
    const lineTotal = line.netAmount != null ? Number(line.netAmount) : (gross - discAmt);

    return {
      id: line.id || `line-${idx}`,
      productId: line.productId || line.product?.id,
      productName: line.product?.name || line.productName || 'Product',
      type: line.lineType || line.type || 'ONE_TIME',
      quantity: qty,
      unitPrice,
      discountPercent: discPct,
      discountAmount: discAmt,
      tax: 0,
      lineTotal,
      fromRecommendation: line.fromRecommendation || false,
    };
  });

  const subtotal = authoritativeTotals?.subtotal != null
    ? Number(authoritativeTotals.subtotal)
    : lines.reduce((sum, l) => sum + (l.unitPrice * l.quantity), 0);

  const discountTotal = authoritativeTotals?.totalDiscount != null
    ? Number(authoritativeTotals.totalDiscount)
    : lines.reduce((sum, l) => sum + l.discountAmount, 0);

  const grandTotal = authoritativeTotals?.total != null
    ? Number(authoritativeTotals.total)
    : Math.max(0, subtotal - discountTotal);

  const normalized = {
    ...q,
    id: q.id,
    quoteNumber: q.quoteNumber || 'QT-' + q.id.substring(0, 8).toUpperCase(),
    customerName: q.customer?.name || q.customerName || 'Customer',
    assignedRep: q.rep?.name || q.assignedRep || 'Sales Rep',
    status: q.status || 'DRAFT',
    created: q.createdAt,
    updated: q.updatedAt || q.createdAt,
    subtotal,
    discountTotal,
    taxTotal: 0,
    grandTotal,
    lines,
    approval: {
      requiredLevel: latestVersion?.riskAssessment?.riskLevel === 'HIGH' ? 'FINANCE_OPS' : (latestVersion?.riskAssessment?.riskLevel === 'MEDIUM' ? 'SALES_MANAGER' : 'AUTO_APPROVED'),
      status: latestVersion?.approvalRequest?.status || 'NOT_REQUIRED',
      steps: [
        {
          role: 'SALES_MANAGER',
          status: q.status === 'APPROVED' || q.status === 'SENT' || q.status === 'CUSTOMER_CONFIRMED' ? 'APPROVED' : (q.status === 'PENDING_APPROVAL' ? 'PENDING' : 'NOT_REQUIRED'),
          reviewer: 'Michael Manager',
          date: q.updatedAt,
        }
      ]
    },
  };

  return { success: true, data: normalized, ...normalized };
};

export const createQuote = async (payload) => {
  const res = await api.post('/quotations', payload);
  return res;
};

export const recalculateQuote = async (id, payload) => {
  // If quotation exists on backend, get authoritative backend totals
  if (id && id !== 'new' && !id.startsWith('new-')) {
    try {
      const res = await api.get(`/quotations/${id}/totals`);
      const totals = res.quotation || res.data?.quotation || res.data || res;
      return {
        success: true,
        data: {
          subtotal: totals.subtotal || 0,
          discountTotal: totals.totalDiscount || 0,
          grandTotal: totals.total || 0,
          lines: totals.lines || [],
        }
      };
    } catch (err) {
      // Fall through to local calculation only for unsaved draft presentation
    }
  }

  // Local calculation strictly for temporary unsaved draft presentation
  const lines = payload.lines || [];
  let subtotal = 0;
  let discountTotal = 0;

  lines.forEach((l) => {
    const gross = (Number(l.unitPrice) || 0) * (Number(l.quantity) || 1);
    const disc = gross * ((Number(l.discountPercent) || 0) / 100);
    subtotal += gross;
    discountTotal += disc;
  });

  const grandTotal = Math.max(0, subtotal - discountTotal);

  return {
    success: true,
    data: {
      subtotal,
      discountTotal,
      taxTotal: 0,
      grandTotal,
    }
  };
};

export const getRecommendations = async (quoteId) => {
  const res = await api.get(`/recommendations/quotations/${quoteId}`);
  const recs = res.recommendations || res.data?.recommendations || (Array.isArray(res.data) ? res.data : []);
  return { success: true, data: recs, recommendations: recs };
};

export const acceptRecommendation = async (quotationId, recommendationId) => {
  const res = await api.post(`/recommendations/quotations/${quotationId}/accept`, {
    recommendationId,
  });
  return res;
};
