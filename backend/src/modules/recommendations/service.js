const prisma = require("../../config/db");
const { AppError } = require("../../middleware/errorHandler");
const { assessQuotationRisk } = require("../discountRisk/service");
const { createApprovalRequest } = require("../approvals/service");

// Statuses where quotation cannot accept recommendations
const IMMUTABLE_STATUSES = [
  "CUSTOMER_CONFIRMED",
  "ORDER_CREATED",
  "FULFILLMENT",
  "PARTIALLY_FULFILLED",
  "FULFILLED",
  "INVOICED",
  "PARTIALLY_PAID",
  "PAID",
  "REJECTED",
  "CANCELLED",
  "EXPIRED",
];

/**
 * Resolve unit sales price considering customer-specific and tier-based price lists
 */
async function resolveProductPrice(productId, customer, currency = "INR") {
  // 1. Customer-specific price list entry
  if (customer && customer.id) {
    const custEntry = await prisma.priceListEntry.findFirst({
      where: { productId, customerId: customer.id, currency },
    });
    if (custEntry) return custEntry.price;
  }

  // 2. Customer tier price list entry
  if (customer && customer.tier && customer.tier.name) {
    const tierEntry = await prisma.priceListEntry.findFirst({
      where: { productId, tierName: customer.tier.name, currency },
    });
    if (tierEntry) return tierEntry.price;
  }

  // 3. Fallback to product base price
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { basePrice: true },
  });

  return product ? product.basePrice : 0;
}

/**
 * Calculate totals, breakdown (one-time vs recurring), and margins for lines
 */
function computeFinancials(lines) {
  let oneTimeSubtotal = 0;
  let oneTimeTotal = 0;
  let recurringSubtotal = 0;
  let recurringTotal = 0;
  let totalCost = 0;

  for (const line of lines) {
    const gross = line.unitPrice * line.quantity;
    const discount = gross * ((line.discountPct || 0) / 100);
    const net = gross - discount;
    const cost = (line.product?.costPrice ?? line.costPrice ?? 0) * line.quantity;

    totalCost += cost;

    if (line.lineType === "RECURRING") {
      recurringSubtotal += gross;
      recurringTotal += net;
    } else {
      oneTimeSubtotal += gross;
      oneTimeTotal += net;
    }
  }

  const grandSubtotal = oneTimeSubtotal + recurringSubtotal;
  const grandTotal = oneTimeTotal + recurringTotal;
  const grossProfit = grandTotal - totalCost;
  const marginPct = grandTotal > 0 ? (grossProfit / grandTotal) * 100 : 0;

  return {
    oneTimeSubtotal,
    oneTimeTotal,
    recurringSubtotal,
    recurringTotal,
    grandSubtotal,
    grandTotal,
    totalCost,
    grossProfit,
    marginPct: Math.round(marginPct * 100) / 100,
  };
}

/**
 * Get ranked recommendations for an existing quotation
 */
async function getRecommendationsForQuotation(quotationId) {
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      customer: { include: { tier: true } },
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: {
          lines: {
            include: {
              product: { include: { category: true } },
            },
          },
        },
      },
    },
  });

  if (!quotation) {
    throw new AppError("Quotation not found", 404);
  }

  const currentVersion = quotation.versions[0];
  if (!currentVersion || currentVersion.lines.length === 0) {
    return [];
  }

  const quotedProductIds = currentVersion.lines.map((l) => l.productId);

  // Find all co-purchase statistics from products in the quote to products not in the quote
  const coPurchaseStats = await prisma.coPurchaseStat.findMany({
    where: {
      fromProductId: { in: quotedProductIds },
      toProductId: { notIn: quotedProductIds },
    },
    include: {
      fromProduct: { include: { category: true } },
      toProduct: { include: { category: true } },
    },
  });

  if (coPurchaseStats.length === 0) {
    return [];
  }

  // Get unique candidate product IDs
  const candidateProductIds = [...new Set(coPurchaseStats.map((s) => s.toProductId))];

  // Fetch active promotions for candidates
  const promotionFlags = await prisma.promotionFlag.findMany({
    where: {
      productId: { in: candidateProductIds },
      active: true,
    },
  });

  const promoMap = new Map(promotionFlags.map((p) => [p.productId, p]));

  // Deduplicate and aggregate candidate evidence
  const candidateMap = new Map();

  for (const stat of coPurchaseStats) {
    const candidate = stat.toProduct;
    if (!candidate.active) continue;

    if (!candidateMap.has(candidate.id)) {
      candidateMap.set(candidate.id, {
        product: candidate,
        triggerProducts: [],
        maxStrengthScore: 0,
      });
    }

    const entry = candidateMap.get(candidate.id);
    entry.triggerProducts.push({
      id: stat.fromProduct.id,
      name: stat.fromProduct.name,
      category: stat.fromProduct.category.name,
      strengthScore: stat.strengthScore,
    });

    if (stat.strengthScore > entry.maxStrengthScore) {
      entry.maxStrengthScore = stat.strengthScore;
    }
  }

  // Score, classify, compute economics, and rank
  const recommendations = [];

  for (const [candidateId, entry] of candidateMap.entries()) {
    const candidate = entry.product;
    const promo = promoMap.get(candidateId);
    const boostWeight = promo ? promo.boostWeight : 1.0;
    const finalScore = Math.round(entry.maxStrengthScore * boostWeight * 1000) / 1000;

    // Resolve sales price
    const resolvedPrice = await resolveProductPrice(
      candidate.id,
      quotation.customer,
      quotation.customer.currency
    );

    // Margin analysis
    const costPrice = candidate.costPrice || 0;
    const unitGrossMargin = resolvedPrice - costPrice;
    const listMarginPct =
      resolvedPrice > 0 ? ((resolvedPrice - costPrice) / resolvedPrice) * 100 : 0;

    // Classification
    const primaryTrigger = entry.triggerProducts[0];
    let type = "CROSS_SELL";
    if (candidate.isSubscription) {
      type = "CROSS_SELL"; // Recurring subscription attach
    } else if (candidate.categoryId === primaryTrigger?.category) {
      if (candidate.basePrice > primaryTrigger.basePrice) {
        type = "UPSELL"; // Higher specification / tier
      } else {
        type = "CROSS_SELL"; // Complementary accessory
      }
    } else {
      type = "CROSS_SELL"; // Complementary category
    }

    // Explainable rationale
    const triggerNames = entry.triggerProducts.map((t) => t.name).join(", ");
    let rationale = `Frequently co-purchased with ${triggerNames} (${Math.round(
      entry.maxStrengthScore * 100
    )}% co-purchase strength)`;

    if (promo) {
      rationale += ` + Active Campaign Promotion (${boostWeight}x boost)`;
    }

    recommendations.push({
      productId: candidate.id,
      name: candidate.name,
      description: candidate.description,
      category: candidate.category.name,
      isSubscription: candidate.isSubscription,
      unit: candidate.unit,
      type,
      rankingScore: finalScore,
      coPurchaseStrength: entry.maxStrengthScore,
      campaignBoost: boostWeight,
      isPromoted: Boolean(promo),
      triggerProducts: entry.triggerProducts,
      pricing: {
        sellingPrice: resolvedPrice,
        basePrice: candidate.basePrice,
        costPrice,
        unitGrossMargin,
        listMarginPct: Math.round(listMarginPct * 10) / 10,
        allowedDiscountPct: candidate.category.discountCeiling,
        currency: quotation.customer.currency,
      },
      rationale,
    });
  }

  // Sort descending by final ranking score
  recommendations.sort((a, b) => b.rankingScore - a.rankingScore);

  return recommendations;
}

/**
 * Get recommendations for a specific product
 */
async function getRecommendationsForProduct(productId, customerId = null) {
  let customer = null;
  if (customerId) {
    customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { tier: true },
    });
  }

  const coPurchaseStats = await prisma.coPurchaseStat.findMany({
    where: { fromProductId: productId },
    include: {
      fromProduct: { include: { category: true } },
      toProduct: { include: { category: true } },
    },
  });

  const candidateProductIds = coPurchaseStats.map((s) => s.toProductId);
  const promotionFlags = await prisma.promotionFlag.findMany({
    where: { productId: { in: candidateProductIds }, active: true },
  });
  const promoMap = new Map(promotionFlags.map((p) => [p.productId, p]));

  const recommendations = [];
  for (const stat of coPurchaseStats) {
    const candidate = stat.toProduct;
    if (!candidate.active) continue;

    const promo = promoMap.get(candidate.id);
    const boostWeight = promo ? promo.boostWeight : 1.0;
    const finalScore = Math.round(stat.strengthScore * boostWeight * 1000) / 1000;

    const resolvedPrice = await resolveProductPrice(
      candidate.id,
      customer,
      customer?.currency || "INR"
    );

    const costPrice = candidate.costPrice || 0;
    const unitGrossMargin = resolvedPrice - costPrice;
    const listMarginPct =
      resolvedPrice > 0 ? ((resolvedPrice - costPrice) / resolvedPrice) * 100 : 0;

    recommendations.push({
      productId: candidate.id,
      name: candidate.name,
      category: candidate.category.name,
      isSubscription: candidate.isSubscription,
      rankingScore: finalScore,
      coPurchaseStrength: stat.strengthScore,
      campaignBoost: boostWeight,
      isPromoted: Boolean(promo),
      pricing: {
        sellingPrice: resolvedPrice,
        costPrice,
        unitGrossMargin,
        listMarginPct: Math.round(listMarginPct * 10) / 10,
        allowedDiscountPct: candidate.category.discountCeiling,
      },
    });
  }

  recommendations.sort((a, b) => b.rankingScore - a.rankingScore);
  return recommendations;
}

/**
 * Accept a recommendation into a quotation.
 * Respects quotation version immutability:
 * - DRAFT: adds directly to current version.
 * - APPROVED / SENT_TO_CUSTOMER / UNDER_NEGOTIATION: creates a new QuotationVersion,
 *   copies existing lines, and appends the recommendation line.
 * - Confirmed / fulfilled / terminal: rejects acceptance.
 */
async function acceptRecommendation({
  quotationId,
  productId,
  quantity = 1,
  discountPct = 0,
  userId,
}) {
  // 1. Validations
  const parsedQuantity = parseInt(quantity, 10);
  if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
    throw new AppError("Quantity must be a positive integer", 400);
  }

  const parsedDiscount = parseFloat(discountPct) || 0;
  if (parsedDiscount < 0 || parsedDiscount > 100) {
    throw new AppError("Discount percentage must be between 0 and 100", 400);
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: true },
  });

  if (!product || !product.active) {
    throw new AppError("Product not found or inactive", 404);
  }

  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      customer: { include: { tier: true } },
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: {
          lines: {
            include: { product: true },
          },
        },
      },
    },
  });

  if (!quotation) {
    throw new AppError("Quotation not found", 404);
  }

  if (IMMUTABLE_STATUSES.includes(quotation.status)) {
    throw new AppError(
      `Cannot accept recommendations on a quotation with status '${quotation.status}'. Only editable quotes permit modifications.`,
      400
    );
  }

  const currentVersion = quotation.versions[0];
  if (!currentVersion) {
    throw new AppError("Quotation has no active version", 400);
  }

  // Prevent duplicate lines of identical product if already present
  const alreadyInQuote = currentVersion.lines.some((l) => l.productId === productId);
  if (alreadyInQuote) {
    throw new AppError("Product is already present in this quotation", 400);
  }

  // Resolve pricing & financial ceiling
  const unitPrice = await resolveProductPrice(
    product.id,
    quotation.customer,
    quotation.customer.currency
  );

  const allowedDiscountPct = product.category.discountCeiling;
  const lineType = product.isSubscription ? "RECURRING" : "ONE_TIME";

  const newLineData = {
    productId: product.id,
    quantity: parsedQuantity,
    unitPrice,
    discountPct: parsedDiscount,
    lineType,
    allowedDiscountPct,
    fromRecommendation: true,
  };

  // Compute economics BEFORE acceptance
  const financialsBefore = computeFinancials(currentVersion.lines);

  let newVersionNumber = quotation.currentVersionNo;
  let targetVersionId = currentVersion.id;

  // 2. Transactional execution respecting version immutability
  await prisma.$transaction(async (tx) => {
    if (quotation.status === "DRAFT") {
      // Direct insertion into current version for draft
      await tx.quotationLine.create({
        data: {
          versionId: currentVersion.id,
          ...newLineData,
        },
      });

      await tx.quotation.update({
        where: { id: quotation.id },
        data: { lastActivityAt: new Date() },
      });
    } else {
      // Immutability: create a new QuotationVersion, copy existing lines, add new line
      newVersionNumber = quotation.currentVersionNo + 1;

      const linesToCopy = currentVersion.lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discountPct: l.discountPct,
        lineType: l.lineType,
        allowedDiscountPct: l.allowedDiscountPct,
        fromRecommendation: l.fromRecommendation,
      }));

      linesToCopy.push(newLineData);

      const createdVersion = await tx.quotationVersion.create({
        data: {
          quotationId: quotation.id,
          versionNumber: newVersionNumber,
          lines: {
            create: linesToCopy,
          },
        },
      });

      targetVersionId = createdVersion.id;

      await tx.quotation.update({
        where: { id: quotation.id },
        data: {
          currentVersionNo: newVersionNumber,
          lastActivityAt: new Date(),
        },
      });
    }
  });

  // 3. Recalculate discount risk on the target version
  const riskResult = await assessQuotationRisk(quotationId);

  // 4. Check if approval is triggered
  let finalStatus = quotation.status;
  let approvalRequired = false;
  let approvalResult = null;

  if (riskResult.riskLevel !== "LOW") {
    approvalRequired = true;
    if (quotation.status === "DRAFT") {
      finalStatus = "PENDING_MANAGER_APPROVAL";
      approvalResult = await createApprovalRequest(quotationId);
    } else {
      finalStatus = "APPROVAL_REQUIRED_AGAIN";
      approvalResult = await createApprovalRequest(quotationId);
      await prisma.quotation.update({
        where: { id: quotationId },
        data: { status: "APPROVAL_REQUIRED_AGAIN" },
      });
    }
  } else {
    // If was approved/sent/negotiating, keep as UNDER_NEGOTIATION so rep/customer can review
    if (quotation.status !== "DRAFT") {
      finalStatus = "UNDER_NEGOTIATION";
      await prisma.quotation.update({
        where: { id: quotationId },
        data: { status: "UNDER_NEGOTIATION" },
      });
    }
  }

  // 5. Fetch updated lines and compute economics AFTER acceptance
  const updatedVersion = await prisma.quotationVersion.findUnique({
    where: { id: targetVersionId },
    include: {
      lines: {
        include: { product: true },
      },
    },
  });

  const financialsAfter = computeFinancials(updatedVersion.lines);

  // Economics of the added recommendation line
  const addedGross = unitPrice * parsedQuantity;
  const addedNet = addedGross * (1 - parsedDiscount / 100);
  const addedCost = (product.costPrice || 0) * parsedQuantity;
  const addedGrossMargin = addedNet - addedCost;
  const addedEffectiveMarginPct = addedNet > 0 ? (addedGrossMargin / addedNet) * 100 : 0;

  return {
    message: "Recommendation accepted successfully",
    quotationId,
    versionNumber: newVersionNumber,
    quotationStatus: finalStatus,
    approvalRequired,
    approvalResult,
    riskLevel: riskResult.riskLevel,
    blendedScore: riskResult.blendedScore,
    acceptedItem: {
      productId: product.id,
      name: product.name,
      quantity: parsedQuantity,
      unitPrice,
      discountPct: parsedDiscount,
      lineType,
      sellingPrice: unitPrice,
      netTotal: addedNet,
      costPrice: product.costPrice || 0,
      unitGrossMargin: unitPrice * (1 - parsedDiscount / 100) - (product.costPrice || 0),
      effectiveMarginPct: Math.round(addedEffectiveMarginPct * 10) / 10,
      fromRecommendation: true,
    },
    economicsImpact: {
      before: financialsBefore,
      after: financialsAfter,
      incrementalRevenue: financialsAfter.grandTotal - financialsBefore.grandTotal,
      incrementalProfit: financialsAfter.grossProfit - financialsBefore.grossProfit,
      recurringDelta: financialsAfter.recurringTotal - financialsBefore.recurringTotal,
      oneTimeDelta: financialsAfter.oneTimeTotal - financialsBefore.oneTimeTotal,
    },
  };
}

/**
 * Configure co-purchase statistics (Admin / Operations)
 */
async function configureCoPurchase({ fromProductId, toProductId, strengthScore }) {
  const parsedScore = parseFloat(strengthScore);
  if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 1) {
    throw new AppError("strengthScore must be a number between 0 and 1", 400);
  }

  return prisma.coPurchaseStat.upsert({
    where: {
      fromProductId_toProductId: {
        fromProductId,
        toProductId,
      },
    },
    update: { strengthScore: parsedScore },
    create: {
      fromProductId,
      toProductId,
      strengthScore: parsedScore,
    },
    include: {
      fromProduct: true,
      toProduct: true,
    },
  });
}

/**
 * Configure promotional campaign flags (Admin / Operations)
 */
async function configurePromotion({ productId, active = true, boostWeight = 1.0 }) {
  const parsedWeight = parseFloat(boostWeight);
  if (isNaN(parsedWeight) || parsedWeight <= 0) {
    throw new AppError("boostWeight must be a positive number", 400);
  }

  return prisma.promotionFlag.upsert({
    where: { productId },
    update: {
      active: Boolean(active),
      boostWeight: parsedWeight,
    },
    create: {
      productId,
      active: Boolean(active),
      boostWeight: parsedWeight,
    },
    include: { product: true },
  });
}

module.exports = {
  getRecommendationsForQuotation,
  getRecommendationsForProduct,
  acceptRecommendation,
  configureCoPurchase,
  configurePromotion,
  resolveProductPrice,
};
