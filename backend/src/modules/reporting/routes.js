const express = require("express");
const controller = require("./controller");
const { requireAuth } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

// Executive management dashboard
router.get("/dashboard", requireAuth, controller.getDashboard);

// Tabular quotation report with filtering
router.get("/quotations", requireAuth, controller.getQuotations);

// CSV Export (restricted to managers and operations roles)
router.get(
  "/export/quotations.csv",
  requireAuth,
  requireRole("ADMIN", "SALES_MANAGER", "FINANCE_OPS"),
  controller.exportCSV
);

// XLS Export (PS Section A7 requirement)
router.get(
  "/export/quotations.xls",
  requireAuth,
  requireRole("ADMIN", "SALES_MANAGER", "FINANCE_OPS"),
  controller.exportXLS
);

// PDF Export (PS Section A7 requirement)
router.get(
  "/export/quotations.pdf",
  requireAuth,
  requireRole("ADMIN", "SALES_MANAGER", "FINANCE_OPS"),
  controller.exportPDF
);

module.exports = router;
