import api from './api';

export const getApprovals = async () => {
  const res = await api.get('/reporting/quotations');
  const allQuotes = res.quotations || res.data?.quotations || [];
  // Filter for quotes pending approval
  const list = allQuotes.filter(
    (q) =>
      q.status === 'PENDING_APPROVAL' ||
      q.status === 'PENDING_MANAGER_APPROVAL' ||
      q.status === 'PENDING_FINANCE_APPROVAL' ||
      q.approvalStatus === 'PENDING'
  );
  return { success: true, data: list, quotations: list };
};

export const getQuoteApproval = async (id) => {
  const res = await api.get(`/approvals/quotations/${id}/requirement`);
  return { success: true, data: res.requirement || res.data || res };
};

export const submitAction = async (id, actionOrPayload, optionalReason) => {
  let rawDecision = '';
  let reason = '';

  if (typeof actionOrPayload === 'string') {
    rawDecision = actionOrPayload;
    reason = optionalReason;
  } else if (actionOrPayload && typeof actionOrPayload === 'object') {
    rawDecision = actionOrPayload.decision || actionOrPayload.action || '';
    reason = actionOrPayload.reason || actionOrPayload.comment;
  }

  // Normalize to backend enum: APPROVED, REJECTED, RETURNED_FOR_REVISION
  let decision = rawDecision;
  const upper = (rawDecision || '').toUpperCase();
  if (upper === 'APPROVE' || upper === 'APPROVED') {
    decision = 'APPROVED';
  } else if (upper === 'REJECT' || upper === 'REJECTED') {
    decision = 'REJECTED';
  } else if (upper === 'RETURN' || upper === 'RETURNED' || upper === 'RETURNED_FOR_REVISION') {
    decision = 'RETURNED_FOR_REVISION';
  }

  const res = await api.post(`/approvals/quotations/${id}/decision`, {
    decision,
    reason: reason || 'Decision logged via portal',
  });
  return res;
};
