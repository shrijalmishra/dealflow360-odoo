const express = require("express");
const controller = require("./priceListController");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

// Get all price list entries
router.get(
  "/",
  requireAuth,
  controller.listPriceListEntries
);

// Get one price list entry
router.get(
  "/:id",
  requireAuth,
  controller.getPriceListEntry
);

// Create a price list entry
router.post(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  controller.createPriceListEntry
);

module.exports = router;
