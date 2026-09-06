import api from './api';

// Retrieve customer portal JWT from localStorage without hardcoded credentials
export function getCustomerToken() {
  const token = localStorage.getItem('dealflow_customer_token');
  return token;
}

export const getCustomerQuotations = async () => {
  const customerToken = getCustomerToken();
  if (!customerToken) throw new Error('Please sign in to the Customer Portal.');
  const headers = { Authorization: `Bearer ${customerToken}` };
  const res = await api.get('/portal/quotations', { headers });
  const list = res.quotations || res.data?.quotations || [];
  return { success: true, data: list, ...list };
};

export const getQuote = async (quotationId) => {
  const customerToken = getCustomerToken();
  if (!customerToken) throw new Error('Please log in to the Customer Portal.');
  const headers = { Authorization: `Bearer ${customerToken}` };

  let targetId = quotationId;
  let allQuotes = [];
  if (!targetId || targetId === 'me') {
    const listRes = await api.get('/portal/quotations', { headers });
    allQuotes = listRes.quotations || listRes.data?.quotations || [];
    if (allQuotes.length > 0) {
      // Prioritize action-ready proposal (Under Negotiation, Quote Received, etc.)
      const actionable = allQuotes.find((q) =>
        q.status === 'Under Negotiation' ||
        q.status === 'Quote Received' ||
        q.status === 'Quote Under Review' ||
        q.status === 'SENT_TO_CUSTOMER' ||
        q.status === 'UNDER_NEGOTIATION'
      );
      targetId = actionable ? actionable.id : allQuotes[0].id;
    } else {
      return { success: true, data: null, allQuotes: [] };
    }
  } else {
    try {
      const listRes = await api.get('/portal/quotations', { headers });
      allQuotes = listRes.quotations || listRes.data?.quotations || [];
    } catch (_) {}
  }

  const res = await api.get(`/portal/quotations/${targetId}`, { headers });
  const q = res.quotation || res.data?.quotation || res.data || res;
  
  // Normalize lines and financials
  const versions = (q.versions || []).slice().sort((a, b) => b.versionNumber - a.versionNumber);
  const latestVersion = versions[0];
  const rawLines = latestVersion?.lines || q.lines || [];
  const lines = rawLines.map((line, idx) => {
    const unitPrice = Number(line.unitPrice || line.product?.basePrice || 0);
    const qty = Number(line.quantity || 1);
    const discPct = Number(line.discountPct || line.discountPercent || 0);
    const lineTotal = line.netAmount != null
      ? Number(line.netAmount)
      : unitPrice * qty * (1 - discPct / 100);

    return {
      id: line.id || `line-${idx}`,
      productName: line.product?.name || line.productName || 'Product',
      quantity: qty,
      unitPrice,
      discountPercent: discPct,
      lineTotal,
    };
  });

  // Use backend-authoritative totals; no tax is applied server-side.
  const subtotal = latestVersion?.subtotal ?? lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const discountTotal = latestVersion?.totalDiscount ?? lines.reduce((s, l) => s + (l.unitPrice * l.quantity * l.discountPercent / 100), 0);
  const grandTotal = latestVersion?.netTotal ?? (subtotal - discountTotal);

  const normalized = {
    ...q,
    id: q.id,
    quoteNumber: q.quoteNumber || 'QT-' + q.id.substring(0, 8).toUpperCase(),
    customerName: q.customer?.name || 'Customer Portal',
    status: q.status || 'SENT_TO_CUSTOMER',
    created: q.createdAt,
    subtotal,
    discountTotal,
    grandTotal,
    lines,
    allQuotes,
  };

  return { success: true, data: normalized, allQuotes, ...normalized };
};

export const submitNegotiation = async (quotationId, payload) => {
  const customerToken = getCustomerToken();
  if (!customerToken) throw new Error('Please log in to the Customer Portal.');
  const headers = { Authorization: `Bearer ${customerToken}` };

  let targetId = quotationId;
  if (!targetId || targetId === 'me') {
    const listRes = await api.get('/portal/quotations', { headers });
    const quotes = listRes.quotations || listRes.data?.quotations || [];
    targetId = quotes[0]?.id;
  }

  // 1. Counter offer if discount specified
  if (payload.counterDiscount) {
    const res = await api.post(
      `/portal/quotations/${targetId}/counter-offer`,
      {
        requestedDiscountPct: Number(payload.counterDiscount),
        reason: payload.changeRequest || 'Customer negotiation request',
      },
      { headers }
    );
    return {
      success: true,
      data: {
        message: res.message || 'Counter-offer submitted. Quotation is under review.',
        newStatus: 'APPROVAL_REQUIRED_AGAIN',
        approvalRequired: true,
      }
    };
  }

  // 2. Change request
  if (payload.changeRequest) {
    await api.post(
      `/portal/quotations/${targetId}/change-requests`,
      { requestedChanges: payload.changeRequest },
      { headers }
    );
  }

  // 3. Line comments
  if (payload.lineComments && typeof payload.lineComments === 'object') {
    for (const [lineId, comment] of Object.entries(payload.lineComments)) {
      if (comment && comment.trim()) {
          await api.post(
            `/portal/quotations/${targetId}/comments`,
            { lineId, comment },
            { headers }
          );
      }
    }
  }

  return {
    success: true,
    data: {
      message: 'Your feedback and change requests have been sent to the sales team.',
      newStatus: 'UNDER_NEGOTIATION',
      approvalRequired: false,
    }
  };
};

export const confirmQuote = async (quotationId) => {
  const customerToken = getCustomerToken();
  if (!customerToken) throw new Error('Please log in to the Customer Portal.');
  const headers = { Authorization: `Bearer ${customerToken}` };

  let targetId = quotationId;
  if (!targetId || targetId === 'me') {
    const listRes = await api.get('/portal/quotations', { headers });
    const quotes = listRes.quotations || listRes.data?.quotations || [];
    const actionable = quotes.find((q) =>
      q.status === 'Under Negotiation' ||
      q.status === 'Quote Received' ||
      q.status === 'Quote Under Review' ||
      q.status === 'SENT_TO_CUSTOMER' ||
      q.status === 'UNDER_NEGOTIATION'
    );
    targetId = actionable ? actionable.id : quotes[0]?.id;
  }

  const res = await api.post(`/portal/quotations/${targetId}/confirm`, {}, { headers });
  return {
    success: true,
    data: {
      message: res.message || 'Quotation confirmed successfully!',
      newStatus: 'CUSTOMER_CONFIRMED',
    }
  };
};
