const express = require("express");
const controller = require("./controller");
const { requireAuth } = require("../../middleware/auth");

const router = express.Router();

router.post(
  "/quotations/:quotationId/assess",
  requireAuth,
  controller.assessQuotationRisk
);

module.exports = router;