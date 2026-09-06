const prisma = require("../../config/db");

async function getRiskLevelFromScore(blendedScore) {
  const rules = await prisma.approvalRule.findMany({
    orderBy: {
      minScore: "asc",
    },
  });

  const matchingRule = rules.find(
    (rule) =>
      blendedScore >= rule.minScore &&
      blendedScore < rule.maxScore
  );

  if (matchingRule) {
    return matchingRule.riskLevel;
  }

  // Handle the upper boundary of the highest configured range.
  const highestRule = rules[rules.length - 1];

  if (
    highestRule &&
    blendedScore >= highestRule.maxScore
  ) {
    return highestRule.riskLevel;
  }

  const error = new Error(
    `No risk level configured for blended score: ${blendedScore}`
  );
  error.statusCode = 400;
  throw error;
}

async function calculateRisk(lines) {
  let worstLineExcessPct = 0;
  let totalExcessValue = 0;

  const assessedLines = lines.map((line) => {
    const allowedDiscountPct = line.allowedDiscountPct;
    const actualDiscountPct = line.discountPct || 0;

    const excessPct = Math.max(
      0,
      actualDiscountPct - allowedDiscountPct
    );

    const grossAmount = line.unitPrice * line.quantity;

    const excessValue =
      grossAmount * (excessPct / 100);

    worstLineExcessPct = Math.max(
      worstLineExcessPct,
      excessPct
    );

    totalExcessValue += excessValue;

    return {
      lineId: line.id,
      productId: line.productId,
      actualDiscountPct,
      allowedDiscountPct,
      excessPct,
      excessValue,
    };
  });

  const blendedScore =
    worstLineExcessPct * 3 +
    totalExcessValue / 10000;

  const riskLevel =
    await getRiskLevelFromScore(blendedScore);

  return {
    riskLevel,
    blendedScore,
    worstLineExcessPct,
    totalExcessValue,
    lines: assessedLines,
  };
}

async function assessQuotationRisk(quotationId) {
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      versions: {
        orderBy: {
          versionNumber: "desc",
        },
        take: 1,
        include: {
          lines: true,
        },
      },
    },
  });

  if (!quotation) {
    const error = new Error("Quotation not found");
    error.statusCode = 404;
    throw error;
  }

  const version = quotation.versions[0];

  if (!version) {
    const error = new Error("Quotation has no version");
    error.statusCode = 400;
    throw error;
  }

  const result = await calculateRisk(version.lines);

  const riskAssessment =
    await prisma.riskAssessment.upsert({
      where: {
        versionId: version.id,
      },
      update: {
        riskLevel: result.riskLevel,
        blendedScore: result.blendedScore,
        worstLineExcessPct:
          result.worstLineExcessPct,
        totalExcessValue:
          result.totalExcessValue,
        computedAt: new Date(),
      },
      create: {
        versionId: version.id,
        riskLevel: result.riskLevel,
        blendedScore: result.blendedScore,
        worstLineExcessPct:
          result.worstLineExcessPct,
        totalExcessValue:
          result.totalExcessValue,
      },
    });

  return {
    quotationId,
    versionNumber: version.versionNumber,
    riskLevel: result.riskLevel,
    ...riskAssessment,
    lines: result.lines,
  };
}

async function getGovernanceConfig() {
  const [tiers, categories, approvalRules] = await Promise.all([
    prisma.customerTier.findMany({ orderBy: { name: "asc" } }),
    prisma.productCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.approvalRule.findMany({ orderBy: { minScore: "asc" } }),
  ]);
  return { tiers, categories, approvalRules };
}

async function updateGovernanceConfig(data) {
  const { tiers, categories, approvalRules } = data;
  if (tiers && Array.isArray(tiers)) {
    for (const t of tiers) {
      if (t.id && t.defaultDiscountCeiling !== undefined) {
        await prisma.customerTier.update({
          where: { id: t.id },
          data: { defaultDiscountCeiling: parseFloat(t.defaultDiscountCeiling) },
        });
      }
    }
  }
  if (categories && Array.isArray(categories)) {
    for (const c of categories) {
      if (c.id && c.discountCeiling !== undefined) {
        await prisma.productCategory.update({
          where: { id: c.id },
          data: { discountCeiling: parseFloat(c.discountCeiling) },
        });
      }
    }
  }
  if (approvalRules && Array.isArray(approvalRules)) {
    for (const r of approvalRules) {
      if (r.id) {
        await prisma.approvalRule.update({
          where: { id: r.id },
          data: {
            ...(r.minScore !== undefined && { minScore: parseFloat(r.minScore) }),
            ...(r.maxScore !== undefined && { maxScore: parseFloat(r.maxScore) }),
            ...(r.requiredSteps && { requiredSteps: r.requiredSteps }),
          },
        });
      }
    }
  }
  return getGovernanceConfig();
}

module.exports = {
  calculateRisk,
  assessQuotationRisk,
  getGovernanceConfig,
  updateGovernanceConfig,
};