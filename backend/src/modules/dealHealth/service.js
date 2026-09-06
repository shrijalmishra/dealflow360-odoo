const prisma = require("../../config/db");
const { AppError } = require("../../middleware/errorHandler");

// Centralized thresholds and deductions
const DEFAULT_CONFIG = {
  stalenessHours: {
    warning: 48,   // 2 days
    critical: 120, // 5 days
  },
  approvalDelayHours: {
    warning: 24,   // 1 day
    critical: 72,  // 3 days
  },
  negotiationDelayHours: {
    warning: 48,   // 2 days
    critical: 96,  // 4 days
  },
  deliveryDelayDays: {
    warning: 3,
    critical: 7,
  },
  paymentDelayDays: {
    warning: 7,
    critical: 15,
  },
  deductions: {
    STALLING_QUOTE: { warning: 15, critical: 25 },
    DISCOUNT_ANOMALY: { MEDIUM: 15, HIGH: 30 },
    APPROVAL_DELAY: { warning: 15, critical: 25 },
    NEGOTIATION_DELAY: { warning: 10, critical: 20 },
    DELIVERY_SLIPPAGE: { warning: 15, critical: 30 },
    PAYMENT_DELAY: { warning: 15, critical: 25 },
  },
  healthLevels: {
    HEALTHY_MIN: 80,
    AT_RISK_MIN: 50,
  },
};

/**
 * Determine health level based on explainable numeric score
 */
function getHealthLevel(score, config = DEFAULT_CONFIG) {
  if (score >= config.healthLevels.HEALTHY_MIN) return "HEALTHY";
  if (score >= config.healthLevels.AT_RISK_MIN) return "AT_RISK";
  return "CRITICAL";
}

/**
 * Assess all anomaly conditions against persisted quotation data
 */
async function detectAnomalies(quotation, config = DEFAULT_CONFIG, now = new Date()) {
  const anomalies = [];
  const factors = [];
  let score = 100;

  const currentVersion = quotation.versions?.[0];
  const isTerminal = ["CANCELLED", "REJECTED", "EXPIRED"].includes(quotation.status);

  if (isTerminal) {
    return {
      healthScore: 0,
      healthLevel: "CRITICAL",
      factors: [
        {
          type: "TERMINAL_STATE",
          severity: "CRITICAL",
          impact: -100,
          message: `Quotation is in terminal status: ${quotation.status}`,
        },
      ],
      anomalies: [],
    };
  }

  // -------------------------------------------------------------
  // A. Quote Staleness / Stalled Deal
  // -------------------------------------------------------------
  const activeStatuses = [
    "DRAFT",
    "APPROVED",
    "SENT_TO_CUSTOMER",
    "UNDER_NEGOTIATION",
    "APPROVAL_REQUIRED_AGAIN",
    "PENDING_MANAGER_APPROVAL",
    "PENDING_FINANCE_APPROVAL",
  ];

  if (activeStatuses.includes(quotation.status)) {
    const lastActivity = quotation.lastActivityAt
      ? new Date(quotation.lastActivityAt)
      : new Date(quotation.createdAt);
    const elapsedHours = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

    if (elapsedHours >= config.stalenessHours.critical) {
      const deduction = config.deductions.STALLING_QUOTE.critical;
      score -= deduction;
      const anomaly = {
        type: "STALLED",
        severity: "CRITICAL",
        message: `Deal is stalled: no activity recorded for ${Math.round(elapsedHours)} hours (exceeds critical threshold of ${config.stalenessHours.critical}h).`,
        escalationRole: "SALES_MANAGER",
        evidence: { elapsedHours: Math.round(elapsedHours), lastActivity },
      };
      anomalies.push(anomaly);
      factors.push({
        type: "STALLED",
        severity: "CRITICAL",
        impact: -deduction,
        message: anomaly.message,
      });
    } else if (elapsedHours >= config.stalenessHours.warning) {
      const deduction = config.deductions.STALLING_QUOTE.warning;
      score -= deduction;
      const anomaly = {
        type: "STALLED",
        severity: "MEDIUM",
        message: `Deal showing inactivity: ${Math.round(elapsedHours)} hours without state progression.`,
        escalationRole: "SALES_REP",
        evidence: { elapsedHours: Math.round(elapsedHours), lastActivity },
      };
      anomalies.push(anomaly);
      factors.push({
        type: "STALLED",
        severity: "MEDIUM",
        impact: -deduction,
        message: anomaly.message,
      });
    }
  }

  // -------------------------------------------------------------
  // B. Discount Anomaly (Reuses existing risk assessment engine)
  // -------------------------------------------------------------
  const riskAssessment = currentVersion?.riskAssessment;
  if (riskAssessment) {
    if (riskAssessment.riskLevel === "HIGH") {
      const deduction = config.deductions.DISCOUNT_ANOMALY.HIGH;
      score -= deduction;
      const anomaly = {
        type: "DISCOUNT_ANOMALY",
        severity: "HIGH",
        message: `High discount risk detected: blended risk score ${riskAssessment.blendedScore} (worst line excess ${riskAssessment.worstLineExcessPct}%, total excess value ₹${riskAssessment.totalExcessValue}).`,
        escalationRole: "FINANCE_OPS",
        evidence: {
          riskLevel: riskAssessment.riskLevel,
          blendedScore: riskAssessment.blendedScore,
          worstLineExcessPct: riskAssessment.worstLineExcessPct,
          totalExcessValue: riskAssessment.totalExcessValue,
        },
      };
      anomalies.push(anomaly);
      factors.push({
        type: "DISCOUNT_ANOMALY",
        severity: "HIGH",
        impact: -deduction,
        message: anomaly.message,
      });
    } else if (riskAssessment.riskLevel === "MEDIUM") {
      const deduction = config.deductions.DISCOUNT_ANOMALY.MEDIUM;
      score -= deduction;
      const anomaly = {
        type: "DISCOUNT_ANOMALY",
        severity: "MEDIUM",
        message: `Moderate discount anomaly: blended score ${riskAssessment.blendedScore} with worst line excess ${riskAssessment.worstLineExcessPct}%.`,
        escalationRole: "SALES_MANAGER",
        evidence: {
          riskLevel: riskAssessment.riskLevel,
          blendedScore: riskAssessment.blendedScore,
          worstLineExcessPct: riskAssessment.worstLineExcessPct,
        },
      };
      anomalies.push(anomaly);
      factors.push({
        type: "DISCOUNT_ANOMALY",
        severity: "MEDIUM",
        impact: -deduction,
        message: anomaly.message,
      });
    }
  }

  // -------------------------------------------------------------
  // C. Approval Delay
  // -------------------------------------------------------------
  const approvalPendingStatuses = [
    "PENDING_MANAGER_APPROVAL",
    "PENDING_FINANCE_APPROVAL",
    "APPROVAL_REQUIRED_AGAIN",
  ];
  const approvalRequest = currentVersion?.approvalRequest;

  if (
    approvalPendingStatuses.includes(quotation.status) ||
    (approvalRequest && approvalRequest.status === "PENDING")
  ) {
    const requestDate = approvalRequest?.createdAt
      ? new Date(approvalRequest.createdAt)
      : new Date(quotation.lastActivityAt || quotation.createdAt);
    const elapsedApprovalHours = (now.getTime() - requestDate.getTime()) / (1000 * 60 * 60);

    const targetRole = approvalRequest?.currentStep || "SALES_MANAGER";

    if (elapsedApprovalHours >= config.approvalDelayHours.critical) {
      const deduction = config.deductions.APPROVAL_DELAY.critical;
      score -= deduction;
      const anomaly = {
        type: "APPROVAL_DELAY",
        severity: "HIGH",
        message: `Critical approval delay: awaiting ${targetRole} decision for ${Math.round(elapsedApprovalHours)} hours (threshold: ${config.approvalDelayHours.critical}h).`,
        escalationRole: targetRole,
        evidence: { elapsedHours: Math.round(elapsedApprovalHours), targetRole },
      };
      anomalies.push(anomaly);
      factors.push({
        type: "APPROVAL_DELAY",
        severity: "HIGH",
        impact: -deduction,
        message: anomaly.message,
      });
    } else if (elapsedApprovalHours >= config.approvalDelayHours.warning) {
      const deduction = config.deductions.APPROVAL_DELAY.warning;
      score -= deduction;
      const anomaly = {
        type: "APPROVAL_DELAY",
        severity: "MEDIUM",
        message: `Approval delay: awaiting ${targetRole} for ${Math.round(elapsedApprovalHours)} hours.`,
        escalationRole: targetRole,
        evidence: { elapsedHours: Math.round(elapsedApprovalHours), targetRole },
      };
      anomalies.push(anomaly);
      factors.push({
        type: "APPROVAL_DELAY",
        severity: "MEDIUM",
        impact: -deduction,
        message: anomaly.message,
      });
    }
  }

  // -------------------------------------------------------------
  // D. Customer Negotiation Delay
  // -------------------------------------------------------------
  if (quotation.status === "UNDER_NEGOTIATION") {
    // Check time since latest negotiation event or lastActivityAt
    const latestEvent = quotation.negotiationEvents?.[0]; // ordered desc
    const negotiationDate = latestEvent?.createdAt
      ? new Date(latestEvent.createdAt)
      : new Date(quotation.lastActivityAt || quotation.createdAt);
    const elapsedNegHours = (now.getTime() - negotiationDate.getTime()) / (1000 * 60 * 60);

    if (elapsedNegHours >= config.negotiationDelayHours.critical) {
      const deduction = config.deductions.NEGOTIATION_DELAY.critical;
      score -= deduction;
      const anomaly = {
        type: "NEGOTIATION_DELAY",
        severity: "HIGH",
        message: `Prolonged customer negotiation: ${Math.round(elapsedNegHours)} hours without negotiation progress.`,
        escalationRole: "SALES_MANAGER",
        evidence: { elapsedHours: Math.round(elapsedNegHours) },
      };
      anomalies.push(anomaly);
      factors.push({
        type: "NEGOTIATION_DELAY",
        severity: "HIGH",
        impact: -deduction,
        message: anomaly.message,
      });
    } else if (elapsedNegHours >= config.negotiationDelayHours.warning) {
      const deduction = config.deductions.NEGOTIATION_DELAY.warning;
      score -= deduction;
      const anomaly = {
        type: "NEGOTIATION_DELAY",
        severity: "MEDIUM",
        message: `Negotiation stalled: ${Math.round(elapsedNegHours)} hours since last customer negotiation activity.`,
        escalationRole: "SALES_REP",
        evidence: { elapsedHours: Math.round(elapsedNegHours) },
      };
      anomalies.push(anomaly);
      factors.push({
        type: "NEGOTIATION_DELAY",
        severity: "MEDIUM",
        impact: -deduction,
        message: anomaly.message,
      });
    }
  }

  // -------------------------------------------------------------
  // E. Fulfillment / Delivery Slippage
  // -------------------------------------------------------------
  if (quotation.fulfillments && quotation.fulfillments.length > 0) {
    for (const f of quotation.fulfillments) {
      const hasBackorders = f.backorders && f.backorders.length > 0;
      const fDate = new Date(f.createdAt);
      const elapsedDays = (now.getTime() - fDate.getTime()) / (1000 * 60 * 60 * 24);

      if (f.status === "BACKORDERED" || hasBackorders) {
        const deduction = config.deductions.DELIVERY_SLIPPAGE.critical;
        score -= deduction;
        const totalPending = f.backorders.reduce((sum, b) => sum + (b.qtyPending || 0), 0);
        const anomaly = {
          type: "DELIVERY_RISK",
          severity: "CRITICAL",
          message: `Delivery slippage: warehouse stock deficit with ${totalPending} pending backordered units.`,
          escalationRole: "SALES_MANAGER",
          evidence: { backorderCount: totalPending, fulfillmentId: f.id },
        };
        anomalies.push(anomaly);
        factors.push({
          type: "DELIVERY_RISK",
          severity: "CRITICAL",
          impact: -deduction,
          message: anomaly.message,
        });
        break; // Count once per quote
      } else if (f.status === "PARTIALLY_FULFILLED" && elapsedDays >= config.deliveryDelayDays.warning) {
        const deduction = config.deductions.DELIVERY_SLIPPAGE.warning;
        score -= deduction;
        const anomaly = {
          type: "DELIVERY_RISK",
          severity: "MEDIUM",
          message: `Delivery delay: fulfillment partially dispatched for ${Math.round(elapsedDays)} days without completion.`,
          escalationRole: "SALES_REP",
          evidence: { elapsedDays: Math.round(elapsedDays), fulfillmentId: f.id },
        };
        anomalies.push(anomaly);
        factors.push({
          type: "DELIVERY_RISK",
          severity: "MEDIUM",
          impact: -deduction,
          message: anomaly.message,
        });
        break;
      }
    }
  }

  // -------------------------------------------------------------
  // F. Payment / Billing Risk
  // -------------------------------------------------------------
  if (quotation.invoices && quotation.invoices.length > 0) {
    for (const inv of quotation.invoices) {
      if (inv.status === "UNPAID" || inv.status === "PARTIALLY_PAID") {
        const invDate = new Date(inv.createdAt);
        const elapsedDays = (now.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24);

        if (elapsedDays >= config.paymentDelayDays.critical) {
          const deduction = config.deductions.PAYMENT_DELAY.critical;
          score -= deduction;
          const anomaly = {
            type: "PAYMENT_DELAY",
            severity: "HIGH",
            message: `Invoice #${inv.id.slice(0, 8)} of ₹${inv.total} is ${inv.status} after ${Math.round(elapsedDays)} days (critical threshold: ${config.paymentDelayDays.critical}d).`,
            escalationRole: "FINANCE_OPS",
            evidence: { invoiceId: inv.id, total: inv.total, elapsedDays: Math.round(elapsedDays) },
          };
          anomalies.push(anomaly);
          factors.push({
            type: "PAYMENT_DELAY",
            severity: "HIGH",
            impact: -deduction,
            message: anomaly.message,
          });
          break;
        } else if (elapsedDays >= config.paymentDelayDays.warning) {
          const deduction = config.deductions.PAYMENT_DELAY.warning;
          score -= deduction;
          const anomaly = {
            type: "PAYMENT_DELAY",
            severity: "MEDIUM",
            message: `Invoice #${inv.id.slice(0, 8)} of ₹${inv.total} overdue (${Math.round(elapsedDays)} days outstanding).`,
            escalationRole: "FINANCE_OPS",
            evidence: { invoiceId: inv.id, total: inv.total, elapsedDays: Math.round(elapsedDays) },
          };
          anomalies.push(anomaly);
          factors.push({
            type: "PAYMENT_DELAY",
            severity: "MEDIUM",
            impact: -deduction,
            message: anomaly.message,
          });
          break;
        }
      }
    }
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  const healthLevel = getHealthLevel(finalScore, config);

  return {
    healthScore: finalScore,
    healthLevel,
    factors,
    anomalies,
  };
}

/**
 * Synchronize detected anomalies with persisted DealAlert records in database
 */
async function syncAlerts(quotationId, detectedAnomalies) {
  // 1. Fetch all existing non-resolved alerts for this quote
  const existingAlerts = await prisma.dealAlert.findMany({
    where: {
      quotationId,
      status: { in: ["OPEN", "ACKNOWLEDGED"] },
    },
  });

  const existingMap = new Map(existingAlerts.map((a) => [a.type, a]));
  const activeDetectedTypes = new Set(detectedAnomalies.map((a) => a.type));

  const syncedAlerts = [];

  await prisma.$transaction(async (tx) => {
    // 2. Upsert/Update active anomalies
    for (const anomaly of detectedAnomalies) {
      const existing = existingMap.get(anomaly.type);

      if (existing) {
        // If underlying condition changed severity or message, update it without duplicating
        const updated = await tx.dealAlert.update({
          where: { id: existing.id },
          data: {
            severity: anomaly.severity,
            message: anomaly.message,
            escalationRole: anomaly.escalationRole,
            detail: JSON.stringify(anomaly.evidence || {}),
          },
        });
        syncedAlerts.push(updated);
      } else {
        // Create new alert
        const created = await tx.dealAlert.create({
          data: {
            quotationId,
            type: anomaly.type,
            severity: anomaly.severity,
            message: anomaly.message,
            detail: JSON.stringify(anomaly.evidence || {}),
            status: "OPEN",
            escalationRole: anomaly.escalationRole,
            triggeredAt: new Date(),
          },
        });
        syncedAlerts.push(created);
      }
    }

    // 3. Auto-resolve alerts whose underlying anomaly has been fixed
    for (const existing of existingAlerts) {
      if (!activeDetectedTypes.has(existing.type)) {
        await tx.dealAlert.update({
          where: { id: existing.id },
          data: {
            status: "RESOLVED",
            resolved: true,
            resolvedAt: new Date(),
          },
        });
      }
    }
  });

  // Return all current alerts for this quote (including recently resolved if any)
  return prisma.dealAlert.findMany({
    where: { quotationId },
    orderBy: { triggeredAt: "desc" },
  });
}

/**
 * Assess health and optionally synchronize alerts for a quotation
 */
async function getQuotationHealth(quotationId, options = {}) {
  const { config = DEFAULT_CONFIG, now = new Date(), persistAlerts = true } = options;

  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      customer: { include: { tier: true } },
      rep: { select: { id: true, name: true, email: true, role: true } },
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: {
          lines: { include: { product: true } },
          riskAssessment: true,
          approvalRequest: { include: { decisions: true } },
        },
      },
      negotiationEvents: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      fulfillments: {
        include: { backorders: true, allocations: true },
      },
      invoices: {
        include: { payments: true },
      },
      dealAlerts: {
        orderBy: { triggeredAt: "desc" },
      },
    },
  });

  if (!quotation) {
    throw new AppError("Quotation not found", 404);
  }

  const assessment = await detectAnomalies(quotation, config, now);

  let alerts = quotation.dealAlerts || [];
  if (persistAlerts) {
    alerts = await syncAlerts(quotationId, assessment.anomalies);
  }

  return {
    quotationId: quotation.id,
    status: quotation.status,
    customerName: quotation.customer.name,
    healthScore: assessment.healthScore,
    healthLevel: assessment.healthLevel,
    factors: assessment.factors,
    anomalies: assessment.anomalies,
    alerts,
  };
}

/**
 * Acknowledge an alert
 */
async function acknowledgeAlert(alertId, user) {
  const alert = await prisma.dealAlert.findUnique({ where: { id: alertId } });
  if (!alert) {
    throw new AppError("Alert not found", 404);
  }

  if (alert.status === "RESOLVED") {
    throw new AppError("Cannot acknowledge an already resolved alert", 400);
  }

  return prisma.dealAlert.update({
    where: { id: alertId },
    data: { status: "ACKNOWLEDGED" },
  });
}

/**
 * Resolve an alert
 */
async function resolveAlert(alertId, user) {
  const alert = await prisma.dealAlert.findUnique({ where: { id: alertId } });
  if (!alert) {
    throw new AppError("Alert not found", 404);
  }

  return prisma.dealAlert.update({
    where: { id: alertId },
    data: {
      status: "RESOLVED",
      resolved: true,
      resolvedAt: new Date(),
    },
  });
}

/**
 * List active alerts with filtering
 */
async function listAlerts(filters = {}) {
  const { status, severity, type } = filters;
  const where = {};

  if (status) {
    where.status = status;
  } else {
    // Default to active alerts
    where.status = { in: ["OPEN", "ACKNOWLEDGED"] };
  }

  if (severity) where.severity = severity;
  if (type) where.type = type;

  return prisma.dealAlert.findMany({
    where,
    include: {
      quotation: {
        include: {
          customer: { select: { name: true } },
          rep: { select: { name: true, email: true } },
        },
      },
    },
    orderBy: { triggeredAt: "desc" },
  });
}

/**
 * Portfolio-wide Deal Health Dashboard Summary
 */
async function getDealHealthSummary(options = {}) {
  const { config = DEFAULT_CONFIG, now = new Date() } = options;

  const quotations = await prisma.quotation.findMany({
    where: {
      status: { notIn: ["CANCELLED", "REJECTED", "EXPIRED"] },
    },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: {
          riskAssessment: true,
          approvalRequest: true,
        },
      },
      negotiationEvents: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      fulfillments: {
        include: { backorders: true },
      },
      invoices: true,
    },
  });

  let healthyCount = 0;
  let atRiskCount = 0;
  let criticalCount = 0;

  let stalledCount = 0;
  let approvalDelayCount = 0;
  let deliverySlippageCount = 0;
  let discountAnomalyCount = 0;

  for (const q of quotations) {
    const assessment = await detectAnomalies(q, config, now);
    if (assessment.healthLevel === "HEALTHY") healthyCount++;
    else if (assessment.healthLevel === "AT_RISK") atRiskCount++;
    else criticalCount++;

    for (const a of assessment.anomalies) {
      if (a.type === "STALLED") stalledCount++;
      if (a.type === "APPROVAL_DELAY") approvalDelayCount++;
      if (a.type === "DELIVERY_RISK") deliverySlippageCount++;
      if (a.type === "DISCOUNT_ANOMALY") discountAnomalyCount++;
    }
  }

  // Active alerts in database
  const openAlerts = await prisma.dealAlert.findMany({
    where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } },
  });

  const alertsBySeverity = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  const alertsByType = {};

  for (const a of openAlerts) {
    alertsBySeverity[a.severity] = (alertsBySeverity[a.severity] || 0) + 1;
    alertsByType[a.type] = (alertsByType[a.type] || 0) + 1;
  }

  return {
    totalActiveQuotations: quotations.length,
    portfolioHealth: {
      healthy: healthyCount,
      atRisk: atRiskCount,
      critical: criticalCount,
    },
    anomaliesDetected: {
      stalledQuotations: stalledCount,
      approvalDelays: approvalDelayCount,
      deliverySlippage: deliverySlippageCount,
      discountAnomalies: discountAnomalyCount,
    },
    alertsSummary: {
      totalOpenAlerts: openAlerts.length,
      bySeverity: alertsBySeverity,
      byType: alertsByType,
    },
  };
}

module.exports = {
  DEFAULT_CONFIG,
  getQuotationHealth,
  detectAnomalies,
  syncAlerts,
  acknowledgeAlert,
  resolveAlert,
  listAlerts,
  getDealHealthSummary,
};
