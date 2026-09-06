const approvalService = require("./service");

async function determineApprovalRequirement(req, res, next) {
  try {
    const result =
      await approvalService.determineApprovalRequirement(
        req.params.quotationId
      );

    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function createApprovalRequest(req, res, next) {
  try {
    const result =
      await approvalService.createApprovalRequest(
        req.params.quotationId
      );

    res.json({
      message: result.requiresApproval
        ? "Approval request created successfully"
        : "Quotation approved automatically",
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

async function decideApproval(req, res, next) {
  try {
    const { decision, reason } = req.body;

    const result =
      await approvalService.decideApproval({
        quotationId: req.params.quotationId,
        approverId: req.user.id,
        decision,
        reason,
      });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  determineApprovalRequirement,
  createApprovalRequest,
  decideApproval,
};