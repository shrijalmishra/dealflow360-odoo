const express = require("express");

const controller = require("./controller");
const { requireAuth } = require("../../middleware/auth");

const router = express.Router();

// List all invoices
router.get(
  "/",
  requireAuth,
  controller.listInvoices
);

// Get one invoice
router.get(
  "/:id",
  requireAuth,
  controller.getInvoiceById
);

// Create one-time invoice for a quotation
router.post(
  "/quotation/:quotationId/one-time",
  requireAuth,
  controller.createOneTimeInvoice
);

// Record payment against an invoice
router.post(
  "/invoices/:invoiceId/payments",
  requireAuth,
  controller.recordPayment
);

module.exports = router;