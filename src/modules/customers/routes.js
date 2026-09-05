const express = require("express");
const controller = require("./controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

// Get all customers
router.get(
  "/",
  requireAuth,
  controller.listCustomers
);

// Get customer tiers
router.get(
  "/tiers",
  requireAuth,
  controller.listCustomerTiers
);

// Get one customer
router.get(
  "/:id",
  requireAuth,
  controller.getCustomer
);

// Create customer
router.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "SALES_REP"),
  controller.createCustomer
);

module.exports = router;