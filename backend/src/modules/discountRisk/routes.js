const express = require("express");
const controller = require("./controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

router.get(
  "/config",
  requireAuth,
  controller.getGovernanceConfig
);

router.put(
  "/config",
  requireAuth,
  requireRole("ADMIN", "SALES_MANAGER"),
  controller.updateGovernanceConfig
);

router.post(
  "/quotations/:quotationId/assess",
  requireAuth,
  controller.assessQuotationRisk
);

module.exports = router;