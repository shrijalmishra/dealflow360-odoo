const express = require("express");
const controller = require("./controller");
const { requireAuth } = require("../../middleware/auth");

const router = express.Router();

// List all subscriptions
router.get(
  "/",
  requireAuth,
  controller.listSubscriptions
);

// Get one subscription
router.get(
  "/:id",
  requireAuth,
  controller.getSubscriptionById
);

// Create a subscription from a quotation
router.post(
  "/",
  requireAuth,
  controller.createSubscription
);

// Cancel a subscription
router.post(
  "/:id/cancel",
  requireAuth,
  controller.cancelSubscription
);

module.exports = router;