const prisma = require("../../config/db");
const { AppError } = require("../../middleware/errorHandler");

// Explicit allowlist — internal states like DRAFT, PENDING_MANAGER_APPROVAL,
// REVISION_REQUIRED, REJECTED are intentionally excluded.
const CUSTOMER_VISIBLE_STATUSES = [
  "SENT_TO_CUSTOMER",
  "UNDER_NEGOTIATION",
  "APPROVAL_REQUIRED_AGAIN",
  "CUSTOMER_CONFIRMED",
  "ORDER_CREATED",
  "FULFILLMENT",
  "PARTIALLY_FULFILLED",
  "FULFILLED",
  "INVOICED",
  "PARTIALLY_PAID",
  "PAID",
  "CANCELLED",
  "EXPIRED",
];

// Map internal status names to friendly customer-facing labels.
function toCustomerStatus(status) {
  const map = {
    SENT_TO_CUSTOMER:      "Quote Received",
    UNDER_NEGOTIATION:     "Under Negotiation",
    APPROVAL_REQUIRED_AGAIN: "Quote Under Review",
    CUSTOMER_CONFIRMED:    "Confirmed",
    ORDER_CREATED:         "Order Created",
    FULFILLMENT:           "Being Fulfilled",
    PARTIALLY_FULFILLED:   "Partially Shipped",
    FULFILLED:             "Fulfilled",
    INVOICED:              "Invoiced",
    PARTIALLY_PAID:        "Partially Paid",
    PAID:                  "Paid",
    CANCELLED:             "Cancelled",
    EXPIRED:               "Expired",
  };
  return map[status] ?? status;
}

// Lightweight list — customerId comes exclusively from the verified JWT.
async function listCustomerQuotations(customerId) {
  const quotations = await prisma.quotation.findMany({
    where: {
      customerId,
      status: { in: CUSTOMER_VISIBLE_STATUSES },
    },
    orderBy: { lastActivityAt: "desc" },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: {
          lines: {
            include: {
              product: { select: { id: true, name: true, unit: true } },
            },
          },
          riskAssessment: {
            select: { riskLevel: true },
          },
        },
      },
    },
  });

  return quotations.map((q) => {
    const v = q.versions[0] ?? null;
    let subtotal = 0;
    let netTotal = 0;

    if (v) {
      v.lines.forEach((l) => {
        const gross = l.unitPrice * l.quantity;
        subtotal += gross;
        netTotal += gross * (1 - l.discountPct / 100);
      });
    }

    return {
      id: q.id,
      status: toCustomerStatus(q.status),
      currentVersionNo: q.currentVersionNo,
      lastActivityAt: q.lastActivityAt,
      createdAt: q.createdAt,
      lineCount: v ? v.lines.length : 0,
      subtotal,
      netTotal,
      riskLevel: v?.riskAssessment?.riskLevel ?? null,
    };
  });
}

// Full detail — WHERE includes both id AND customerId so a wrong ID → 404,
// never a data leak to another customer.
async function getCustomerQuotationById(customerId, quotationId) {
  const quotation = await prisma.quotation.findFirst({
    where: {
      id: quotationId,
      customerId,
      status: { in: CUSTOMER_VISIBLE_STATUSES },
    },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        include: {
          lines: {
            include: {
              product: {
                include: { category: { select: { id: true, name: true } } },
              },
            },
          },
          riskAssessment: {
            select: { riskLevel: true, blendedScore: true, computedAt: true },
          },
          // Only expose whether review is pending/resolved — not who approves or
          // the internal step names.
          approvalRequest: {
            select: { status: true, createdAt: true },
          },
        },
      },
      negotiationEvents: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          type: true,
          payload: true,
          actor: true,
          createdAt: true,
        },
      },
      invoices: {
        select: {
          id: true,
          type: true,
          total: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  if (!quotation) {
    throw new AppError("Quotation not found", 404);
  }

  const versions = quotation.versions.map((v) => {
    let subtotal = 0;
    let totalDiscount = 0;
    let netTotal = 0;

    const lines = v.lines.map((l) => {
      const gross = l.unitPrice * l.quantity;
      const discount = gross * (l.discountPct / 100);
      const net = gross - discount;
      subtotal += gross;
      totalDiscount += discount;
      netTotal += net;

      return {
        id: l.id,
        product: {
          id: l.product.id,
          name: l.product.name,
          category: l.product.category.name,
        },
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discountPct: l.discountPct,
        lineType: l.lineType,
        grossAmount: gross,
        discountAmount: discount,
        netAmount: net,
      };
    });

    // Translate approval state to customer-safe label.
    let approvalStatus = null;
    if (v.approvalRequest) {
      const s = v.approvalRequest.status;
      approvalStatus =
        s === "APPROVED"            ? "approved"
        : s === "REJECTED"          ? "rejected"
        : s === "RETURNED_FOR_REVISION" ? "revision_requested"
        : "under_review";
    }

    return {
      versionNumber: v.versionNumber,
      createdAt: v.createdAt,
      lines,
      subtotal,
      totalDiscount,
      netTotal,
      riskLevel: v.riskAssessment?.riskLevel ?? null,
      approvalStatus,
    };
  });

  return {
    id: quotation.id,
    status: toCustomerStatus(quotation.status),
    internalStatus: quotation.status,
    currentVersionNo: quotation.currentVersionNo,
    lastActivityAt: quotation.lastActivityAt,
    createdAt: quotation.createdAt,
    versions,
    negotiationEvents: quotation.negotiationEvents,
    invoices: quotation.invoices,
  };
}

module.exports = {
  CUSTOMER_VISIBLE_STATUSES,
  listCustomerQuotations,
  getCustomerQuotationById,
};
