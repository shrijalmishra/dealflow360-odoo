const express = require("express");
const controller = require("./controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

// Reps and Managers can query and accept recommendations
router.get(
  "/quotations/:quotationId",
  requireAuth,
  controller.getQuotationRecommendations
);

router.get(
  "/products/:productId",
  requireAuth,
  controller.getProductRecommendations
);

router.post(
  "/quotations/:quotationId/accept",
  requireAuth,
  controller.acceptRecommendation
);

// Admin-only endpoints for configuring co-purchase correlations and promotion campaigns
router.post(
  "/co-purchase",
  requireAuth,
  requireRole("ADMIN"),
  controller.configureCoPurchase
);

router.post(
  "/promotions",
  requireAuth,
  requireRole("ADMIN"),
  controller.configurePromotion
);

module.exports = router;
