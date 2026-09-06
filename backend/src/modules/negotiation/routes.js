const express = require("express");
const controller = require("./controller");
const { requireAuth } = require("../../middleware/auth");

const router = express.Router();

// All routes require internal JWT authentication
router.get("/:quotationId", requireAuth, controller.getEvents);
router.post("/:quotationId/comment", requireAuth, controller.addComment);
router.post("/:quotationId/counter-offer", requireAuth, controller.submitCounterOffer);

module.exports = router;
