const express = require("express");
const controller = require("./controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

// Portfolio summary
router.get("/summary", requireAuth, controller.getSummary);

// Alert management
router.get("/alerts", requireAuth, controller.listAlerts);
router.patch("/alerts/:id/acknowledge", requireAuth, controller.acknowledgeAlert);
router.patch(
  "/alerts/:id/resolve",
  requireAuth,
  requireRole("ADMIN", "SALES_MANAGER", "FINANCE_OPS"),
  controller.resolveAlert
);

// Quotation health assessment
router.get("/quotations/:quotationId", requireAuth, controller.getQuotationHealth);
router.post("/quotations/:quotationId/refresh", requireAuth, controller.refreshQuotationHealth);

module.exports = router;
