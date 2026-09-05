const express = require("express");

const controller = require("./controller");
const { requireAuth } = require("../../middleware/auth");

const router = express.Router();

// List all warehouses with inventory
router.get(
  "/",
  requireAuth,
  controller.listWarehouses
);

// Get one warehouse
router.get(
  "/:id",
  requireAuth,
  controller.getWarehouseById
);

// Get inventory for a product across warehouses
router.get(
  "/inventory/product/:productId",
  requireAuth,
  controller.getProductInventory
);

// Calculate allocation plan for an approved quotation
router.get(
  "/allocation/quotation/:quotationId",
  requireAuth,
  controller.calculateQuotationAllocation
);

// Create actual fulfillment and reserve inventory
router.post(
  "/fulfillment/quotation/:quotationId",
  requireAuth,
  controller.createFulfillment
);

module.exports = router;