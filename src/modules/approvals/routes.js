const express = require("express");

const controller = require("./controller");
const { requireAuth } = require("../../middleware/auth");

const router = express.Router();

// Determine whether a quotation requires approval
router.get(
  "/quotations/:quotationId/requirement",
  requireAuth,
  controller.determineApprovalRequirement
);

// Create an approval request
router.post(
  "/quotations/:quotationId/request",
  requireAuth,
  controller.createApprovalRequest
);

// Approve / reject / return quotation
router.post(
  "/quotations/:quotationId/decision",
  requireAuth,
  controller.decideApproval
);

module.exports = router;