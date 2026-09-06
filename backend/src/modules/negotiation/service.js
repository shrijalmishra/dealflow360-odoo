const prisma = require("../../config/db");
const { AppError } = require("../../middleware/errorHandler");
const { assessQuotationRisk } = require("../discountRisk/service");
const { createApprovalRequest } = require("../approvals/service");

// Allowed statuses for negotiation
const NEGOTIABLE_STATUSES = [
  "SENT_TO_CUSTOMER",
  "UNDER_NEGOTIATION",
];

const CONFIRMABLE_STATUSES = [
  "SENT_TO_CUSTOMER",
  "UNDER_NEGOTIATION",
  "APPROVAL_REQUIRED_AGAIN",
  "APPROVED",
];

/**
 * Add a line-level comment or general comment on quotation
 */
async function addComment({ quotationId, actor, lineId, comment, isCustomer = false, customerId = null }) {
  if (!comment || typeof comment !== "string" || !comment.trim()) {
    throw new AppError("Comment text is required", 400);
  }

  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: { lines: true },
      },
    },
  });

  if (!quotation) {
    throw new AppError("Quotation not found", 404);
  }

  if (isCustomer && customerId && quotation.customerId !== customerId) {
    throw new AppError("Quotation not found", 404);
  }

  const currentVersion = quotation.versions[0];
  let targetLine = null;
  if (lineId) {
    targetLine = currentVersion?.lines.find((l) => l.id === lineId);
    if (!targetLine) {
      throw new AppError("Quotation line not found on current version", 404);
    }
  }

  const event = await prisma.negotiationEvent.create({
    data: {
      quotationId,
      type: "LINE_COMMENT",
      actor,
      payload: {
        lineId: targetLine ? targetLine.id : null,
        productId: targetLine ? targetLine.productId : null,
        comment: comment.trim(),
        versionNumber: quotation.currentVersionNo,
      },
    },
  });

  // If currently SENT_TO_CUSTOMER, transition to UNDER_NEGOTIATION
  const updateData = { lastActivityAt: new Date() };
  if (quotation.status === "SENT_TO_CUSTOMER") {
    updateData.status = "UNDER_NEGOTIATION";
  }

  await prisma.quotation.update({
    where: { id: quotationId },
    data: updateData,
  });

  return event;
}

/**
 * Add a structured change request on a line (quantity, discount change request)
 */
async function addChangeRequest({ quotationId, actor, lineId, requestedQuantity, requestedDiscountPct, notes, isCustomer = false, customerId = null }) {
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: { lines: true },
      },
    },
  });

  if (!quotation) {
    throw new AppError("Quotation not found", 404);
  }

  if (isCustomer && customerId && quotation.customerId !== customerId) {
    throw new AppError("Quotation not found", 404);
  }

  const currentVersion = quotation.versions[0];
  const targetLine = currentVersion?.lines.find((l) => l.id === lineId);
  if (!targetLine) {
    throw new AppError("Quotation line not found on current version", 404);
  }

  const payload = {
    lineId: targetLine.id,
    productId: targetLine.productId,
    currentQuantity: targetLine.quantity,
    currentDiscountPct: targetLine.discountPct,
    requestedQuantity: requestedQuantity != null ? Number(requestedQuantity) : targetLine.quantity,
    requestedDiscountPct: requestedDiscountPct != null ? Number(requestedDiscountPct) : targetLine.discountPct,
    notes: notes || null,
    versionNumber: quotation.currentVersionNo,
  };

  const event = await prisma.negotiationEvent.create({
    data: {
      quotationId,
      type: "CHANGE_REQUEST",
      actor,
      payload,
    },
  });

  const updateData = { lastActivityAt: new Date() };
  if (quotation.status === "SENT_TO_CUSTOMER") {
    updateData.status = "UNDER_NEGOTIATION";
  }

  await prisma.quotation.update({
    where: { id: quotationId },
    data: updateData,
  });

  return event;
}

/**
 * Submit counter-proposal (customer or sales rep):
 * 1. Validates quotation state
 * 2. Records COUNTER_DISCOUNT event
 * 3. Creates new QuotationVersion (versionNumber = currentVersionNo + 1)
 * 4. Recalculates discount risk on the new version
 * 5. If risk requires approval, transitions status to APPROVAL_REQUIRED_AGAIN & creates approval request.
 *    If low risk, transitions/keeps status as UNDER_NEGOTIATION.
 */
async function submitCounterOffer({
  quotationId,
  actor,
  lines, // array of { lineId, discountPct, quantity }
  notes = null,
  isCustomer = false,
  customerId = null,
}) {
  if (!lines || !Array.isArray(lines) || lines.length === 0) {
    throw new AppError("At least one line modification is required for a counter-offer", 400);
  }

  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: { lines: true },
      },
    },
  });

  if (!quotation) {
    throw new AppError("Quotation not found", 404);
  }

  if (isCustomer && customerId && quotation.customerId !== customerId) {
    throw new AppError("Quotation not found", 404);
  }

  if (!NEGOTIABLE_STATUSES.includes(quotation.status)) {
    throw new AppError(
      `Quotation cannot be negotiated in its current status (${quotation.status})`,
      400
    );
  }

  const currentVersion = quotation.versions[0];
  if (!currentVersion) {
    throw new AppError("Quotation has no active version", 400);
  }

  // Create a map of incoming modifications
  const lineModMap = new Map();
  for (const mod of lines) {
    if (mod.lineId) {
      lineModMap.set(mod.lineId, mod);
    }
  }

  // Build the new lines for the next version
  const newLinesData = currentVersion.lines.map((existingLine) => {
    const mod = lineModMap.get(existingLine.id);
    const newDiscountPct =
      mod && mod.discountPct !== undefined ? Number(mod.discountPct) : existingLine.discountPct;
    const newQuantity =
      mod && mod.quantity !== undefined ? Number(mod.quantity) : existingLine.quantity;

    if (newDiscountPct < 0 || newDiscountPct > 100) {
      throw new AppError(`Invalid discount percentage: ${newDiscountPct}`, 400);
    }
    if (newQuantity <= 0) {
      throw new AppError(`Quantity must be greater than zero`, 400);
    }

    return {
      productId: existingLine.productId,
      quantity: newQuantity,
      unitPrice: existingLine.unitPrice,
      discountPct: newDiscountPct,
      lineType: existingLine.lineType,
      allowedDiscountPct: existingLine.allowedDiscountPct,
      fromRecommendation: existingLine.fromRecommendation,
    };
  });

  const nextVersionNumber = quotation.currentVersionNo + 1;

  // Transaction: Record event, create new version, update quotation currentVersionNo
  const [event, newVersion] = await prisma.$transaction(async (tx) => {
    // 1. Record NegotiationEvent
    const negEvent = await tx.negotiationEvent.create({
      data: {
        quotationId,
        type: "COUNTER_DISCOUNT",
        actor,
        payload: {
          fromVersion: quotation.currentVersionNo,
          toVersion: nextVersionNumber,
          notes,
          modifiedLines: lines,
        },
      },
    });

    // 2. Create new QuotationVersion with lines
    const version = await tx.quotationVersion.create({
      data: {
        quotationId,
        versionNumber: nextVersionNumber,
        lines: {
          create: newLinesData,
        },
      },
      include: {
        lines: true,
      },
    });

    // 3. Update Quotation currentVersionNo and lastActivityAt
    await tx.quotation.update({
      where: { id: quotationId },
      data: {
        currentVersionNo: nextVersionNumber,
        lastActivityAt: new Date(),
      },
    });

    return [negEvent, version];
  });

  // 4. Recalculate discount risk on the new version
  const riskResult = await assessQuotationRisk(quotationId);

  // 5. Trigger approval if risk requires it
  let finalStatus = "UNDER_NEGOTIATION";
  let approvalResult = null;

  if (riskResult.riskLevel === "LOW") {
    finalStatus = "UNDER_NEGOTIATION";
    await prisma.quotation.update({
      where: { id: quotationId },
      data: { status: finalStatus },
    });
  } else {
    // MEDIUM or HIGH risk requires approval
    finalStatus = "APPROVAL_REQUIRED_AGAIN";
    approvalResult = await createApprovalRequest(quotationId);
    // Explicitly ensure status is APPROVAL_REQUIRED_AGAIN
    await prisma.quotation.update({
      where: { id: quotationId },
      data: { status: "APPROVAL_REQUIRED_AGAIN" },
    });
  }

  return {
    event,
    newVersionNumber: nextVersionNumber,
    riskLevel: riskResult.riskLevel,
    blendedScore: riskResult.blendedScore,
    status: finalStatus,
    approvalRequired: riskResult.riskLevel !== "LOW",
    approvalResult,
  };
}

/**
 * Customer confirms quotation (Part 9)
 */
async function confirmQuotation({ quotationId, actor, isCustomer = false, customerId = null }) {
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: {
          lines: true,
          riskAssessment: true,
          approvalRequest: true,
        },
      },
    },
  });

  if (!quotation) {
    throw new AppError("Quotation not found", 404);
  }

  if (isCustomer && customerId && quotation.customerId !== customerId) {
    throw new AppError("Quotation not found", 404);
  }

  // If already confirmed or in fulfillment/invoiced/paid, handle gracefully and return confirmed status
  if (
    quotation.status === "CUSTOMER_CONFIRMED" ||
    ["ORDER_CREATED", "FULFILLMENT", "PARTIALLY_FULFILLED", "FULFILLED", "INVOICED", "PAID"].includes(quotation.status)
  ) {
    return {
      quotation,
      event: null,
      alreadyConfirmed: true,
      message: "Quotation is already confirmed and active.",
    };
  }

  // Must be in a confirmable status
  if (!CONFIRMABLE_STATUSES.includes(quotation.status)) {
    throw new AppError(
      `Quotation cannot be confirmed in its current status (${quotation.status}). It must be sent to customer.`,
      400
    );
  }

  // Record CONFIRM_QUOTE event
  const event = await prisma.negotiationEvent.create({
    data: {
      quotationId,
      type: "CONFIRM_QUOTE",
      actor,
      payload: {
        confirmedAt: new Date(),
        versionNumber: quotation.currentVersionNo,
      },
    },
  });

  // Update quotation status to CUSTOMER_CONFIRMED
  const updatedQuotation = await prisma.quotation.update({
    where: { id: quotationId },
    data: {
      status: "CUSTOMER_CONFIRMED",
      lastActivityAt: new Date(),
    },
  });

  return {
    quotation: updatedQuotation,
    event,
  };
}

/**
 * Get all negotiation events for a quotation
 */
async function getNegotiationEvents(quotationId, customerId = null) {
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
  });

  if (!quotation) {
    throw new AppError("Quotation not found", 404);
  }

  if (customerId && quotation.customerId !== customerId) {
    throw new AppError("Quotation not found", 404);
  }

  return prisma.negotiationEvent.findMany({
    where: { quotationId },
    orderBy: { createdAt: "asc" },
  });
}

module.exports = {
  NEGOTIABLE_STATUSES,
  CONFIRMABLE_STATUSES,
  addComment,
  addChangeRequest,
  submitCounterOffer,
  confirmQuotation,
  getNegotiationEvents,
};
