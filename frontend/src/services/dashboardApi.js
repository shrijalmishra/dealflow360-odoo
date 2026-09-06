import api from './api';

/**
 * Fetch the executive dashboard from /reporting/dashboard and normalise the
 * response to the shape that Dashboard.jsx expects.
 *
 * Backend shape (reporting/service.js → getExecutiveDashboard):
 *   executiveSummary   { totalQuotations, pipelineNetValue, realizedRevenue, … }
 *   approvalPipeline   { pending, … }
 *   fulfillmentAndDelivery { statusCounts: { BACKORDERED } }
 *   billingAndCollections  { totalCollected, totalOutstanding }
 *   dealHealthOverview     { portfolioHealth: { atRisk, critical }, anomaliesDetected, alertsSummary }
 */
export const getDashboard = async () => {
  const res = await api.get('/reporting/dashboard');

  // The api interceptor either returns res.data or the raw object
  const d = res.data ?? res;

  const exec    = d.executiveSummary      ?? {};
  const health  = d.dealHealthOverview    ?? {};
  const billing = d.billingAndCollections ?? {};
  const fulfill = d.fulfillmentAndDelivery ?? {};
  const apprv   = d.approvalPipeline      ?? {};
  const alerts  = d.alertsSummary         ?? health.alertsSummary ?? {};
  const portfolio = health.portfolioHealth ?? {};
  const anomalies = health.anomaliesDetected ?? {};

  // Stalled deals → use open alerts if available (alertsSummary.byType.STALLED)
  // We can also derive counts from anomaliesDetected
  const stalledCount  = anomalies.stalledQuotations ?? 0;
  const discountCount = anomalies.discountAnomalies  ?? 0;
  const deliveryCount = anomalies.deliverySlippage   ?? 0;

  // Build summary card arrays from anomaly counts (no individual list available from summary)
  const stalledDeals = stalledCount > 0
    ? Array.from({ length: Math.min(stalledCount, 5) }, (_, i) => ({
        quoteNumber: null,
        status: 'STALLED',
        customer: null,
        inactivity: null,
        amount: null,
      }))
    : [];

  const discountAnomalies = discountCount > 0
    ? Array.from({ length: Math.min(discountCount, 5) }, (_, i) => ({
        quoteNumber: null,
        rep: null,
        severity: 'HIGH',
        discount: null,
        historicalAverage: null,
      }))
    : [];

  const deliverySlippage = deliveryCount > 0
    ? Array.from({ length: Math.min(deliveryCount, 5) }, (_, i) => ({
        orderId: null,
        expected: null,
        actualStatus: 'DELAYED',
      }))
    : [];

  const normalized = {
    // KPI cards
    totalQuotations:     exec.totalQuotations    ?? 0,
    pendingApprovals:    apprv.pending            ?? 0,
    atRiskDeals:         (portfolio.atRisk ?? 0) + (portfolio.critical ?? 0),
    revenue:             exec.realizedRevenue     ?? exec.pipelineNetValue ?? billing.totalCollected ?? 0,
    outstandingPayments: billing.totalOutstanding ?? 0,
    fulfillmentIssues:   fulfill.statusCounts?.BACKORDERED ?? 0,

    // Health portfolio
    portfolioHealth: portfolio,
    anomaliesDetected: anomalies,
    alertsSummary: alerts,

    // Alert detail lists (populated from deal-health alerts API separately;
    // here we surface counts so Dashboard can show a summary view)
    stalledDeals,
    discountAnomalies,
    deliverySlippage,

    // Extra metrics
    winRatePct: exec.winRatePct  ?? 0,
    recurringMRR: exec.recurringMRR ?? 0,
  };

  return { success: true, data: normalized };
};
