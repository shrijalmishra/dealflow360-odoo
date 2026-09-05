const express = require("express");
const controller = require("./controller");
const { requireAuth } = require("../../middleware/auth");

const router = express.Router();

router.post("/", requireAuth, controller.createQuotation);

router.get(
  "/:id",
  requireAuth,
  controller.getQuotationById
);

router.get(
  "/:id/totals",
  requireAuth,
  controller.getQuotationTotals
);

module.exports = router;