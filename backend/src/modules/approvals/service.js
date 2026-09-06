const prisma = require("../../config/db");

async function getApplicableApprovalRule(riskLevel) {
  const rule = await prisma.approvalRule.findUnique({
    where: { riskLevel },
  });

  if (!rule) {
    const error = new Error(
      `No approval rule configured for risk level: ${riskLevel}`
    );
    error.statusCode = 400;
    throw error;
  }

  return rule;
}

async function getQuotationRisk(quotationId) {
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      versions: {
        orderBy: {
          versionNumber: "desc",
        },
        take: 1,
        include: {
          riskAssessment: true,
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

  if (!version.riskAssessment) {
    const error = new Error(
      "Quotation risk has not been assessed yet"
    );
    error.statusCode = 400;
    throw error;
  }

  return {
    quotation,
    version,
    riskAssessment: version.riskAssessment,
  };
}

async function determineApprovalRequirement(quotationId) {
  const {
    quotation,
    version,
    riskAssessment,
  } = await getQuotationRisk(quotationId);

  const rule = await getApplicableApprovalRule(
    riskAssessment.riskLevel
  );

  return {
    quotationId: quotation.id,
    versionId: version.id,
    versionNumber: version.versionNumber,
    riskLevel: riskAssessment.riskLevel,
    blendedScore: riskAssessment.blendedScore,
    approvalRule: {
      id: rule.id,
      riskLevel: rule.riskLevel,
      requiredSteps: rule.requiredSteps,
      minScore: rule.minScore,
      maxScore: rule.maxScore,
    },
  };
}

async function createApprovalRequest(quotationId) {
  const {
    quotation,
    version,
    riskAssessment,
  } = await getQuotationRisk(quotationId);

  const rule = await getApplicableApprovalRule(
    riskAssessment.riskLevel
  );

  const requiredSteps = Array.isArray(rule.requiredSteps)
    ? rule.requiredSteps
    : [];

  // LOW risk does not require approval.
  if (requiredSteps.length === 0) {
    await prisma.quotation.update({
      where: { id: quotation.id },
      data: {
        status: "APPROVED",
      },
    });

    return {
      requiresApproval: false,
      quotationId: quotation.id,
      versionId: version.id,
      riskLevel: riskAssessment.riskLevel,
      status: "APPROVED",
    };
  }

  const existingRequest =
    await prisma.approvalRequest.findUnique({
      where: {
        versionId: version.id,
      },
      include: {
        decisions: true,
      },
    });

  if (existingRequest) {
    return {
      requiresApproval: true,
      quotationId: quotation.id,
      versionId: version.id,
      riskLevel: riskAssessment.riskLevel,
      approvalRequest: existingRequest,
    };
  }

  const firstStep = requiredSteps[0];

  const approvalRequest =
    await prisma.approvalRequest.create({
      data: {
        versionId: version.id,
        currentStep: firstStep,
        status: "PENDING",
      },
      include: {
        decisions: true,
      },
    });

  let quotationStatus = "PENDING_MANAGER_APPROVAL";

  if (firstStep === "FINANCE_OPS") {
    quotationStatus = "PENDING_FINANCE_APPROVAL";
  }

  await prisma.quotation.update({
    where: {
      id: quotation.id,
    },
    data: {
      status: quotationStatus,
    },
  });

  return {
    requiresApproval: true,
    quotationId: quotation.id,
    versionId: version.id,
    riskLevel: riskAssessment.riskLevel,
    requiredSteps,
    approvalRequest,
  };
}

async function decideApproval({
  quotationId,
  approverId,
  decision,
  reason,
}) {
  const { quotation, version, riskAssessment } =
    await getQuotationRisk(quotationId);

  const approvalRequest =
    await prisma.approvalRequest.findUnique({
      where: {
        versionId: version.id,
      },
      include: {
        decisions: true,
      },
    });

  if (!approvalRequest) {
    const error = new Error(
      "No approval request exists for this quotation"
    );
    error.statusCode = 400;
    throw error;
  }

  if (approvalRequest.status !== "PENDING") {
    const error = new Error(
      "This approval request has already been resolved"
    );
    error.statusCode = 400;
    throw error;
  }

  const approver = await prisma.user.findUnique({
    where: {
      id: approverId,
    },
  });

  if (!approver) {
    const error = new Error("Approver not found");
    error.statusCode = 404;
    throw error;
  }

  const rule = await getApplicableApprovalRule(
    riskAssessment.riskLevel
  );

  const requiredSteps = Array.isArray(rule.requiredSteps)
    ? rule.requiredSteps
    : [];

  const currentStepIndex =
    requiredSteps.indexOf(approvalRequest.currentStep);

  if (currentStepIndex === -1) {
    const error = new Error(
      "Current approval step is not configured for this risk level"
    );
    error.statusCode = 400;
    throw error;
  }

  if (
    approver.role !== approvalRequest.currentStep &&
    approver.role !== "ADMIN"
  ) {
    const error = new Error(
      `This approval requires ${approvalRequest.currentStep}`
    );
    error.statusCode = 403;
    throw error;
  }

  if (
    !["APPROVED", "REJECTED", "RETURNED_FOR_REVISION"].includes(
      decision
    )
  ) {
    const error = new Error("Invalid approval decision");
    error.statusCode = 400;
    throw error;
  }

  const approvalDecision =
    await prisma.approvalDecision.create({
      data: {
        requestId: approvalRequest.id,
        approverId,
        step: approvalRequest.currentStep,
        decision,
        reason: reason || null,
      },
    });

  // Rejected
  if (decision === "REJECTED") {
    await prisma.approvalRequest.update({
      where: {
        id: approvalRequest.id,
      },
      data: {
        status: "REJECTED",
      },
    });

    await prisma.quotation.update({
      where: {
        id: quotation.id,
      },
      data: {
        status: "REJECTED",
      },
    });

    return {
      message: "Quotation rejected",
      quotationId: quotation.id,
      quotationStatus: "REJECTED",
      approvalDecision,
    };
  }

  // Returned for revision
  if (decision === "RETURNED_FOR_REVISION") {
    await prisma.approvalRequest.update({
      where: {
        id: approvalRequest.id,
      },
      data: {
        status: "RETURNED_FOR_REVISION",
      },
    });

    await prisma.quotation.update({
      where: {
        id: quotation.id,
      },
      data: {
        status: "REVISION_REQUIRED",
      },
    });

    return {
      message: "Quotation returned for revision",
      quotationId: quotation.id,
      quotationStatus: "REVISION_REQUIRED",
      approvalDecision,
    };
  }

  // Approved current step
  const nextStep =
    requiredSteps[currentStepIndex + 1];

  if (nextStep) {
    await prisma.approvalRequest.update({
      where: {
        id: approvalRequest.id,
      },
      data: {
        currentStep: nextStep,
        status: "PENDING",
      },
    });

    let quotationStatus =
      "PENDING_MANAGER_APPROVAL";

    if (nextStep === "FINANCE_OPS") {
      quotationStatus =
        "PENDING_FINANCE_APPROVAL";
    }

    await prisma.quotation.update({
      where: {
        id: quotation.id,
      },
      data: {
        status: quotationStatus,
      },
    });

    return {
      message: "Approval step completed",
      quotationId: quotation.id,
      quotationStatus,
      nextStep,
      approvalDecision,
    };
  }

  // All approval steps completed
  await prisma.approvalRequest.update({
    where: {
      id: approvalRequest.id,
    },
    data: {
      status: "APPROVED",
    },
  });

  await prisma.quotation.update({
    where: {
      id: quotation.id,
    },
    data: {
      status: "APPROVED",
    },
  });

  return {
    message: "Quotation fully approved",
    quotationId: quotation.id,
    quotationStatus: "APPROVED",
    approvalDecision,
  };
}

module.exports = {
  getApplicableApprovalRule,
  determineApprovalRequirement,
  createApprovalRequest,
  decideApproval,
};