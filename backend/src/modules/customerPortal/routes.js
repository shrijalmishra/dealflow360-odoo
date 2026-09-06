const express = require("express");
const controller = require("./controller");
const { requireCustomerAuth } = require("../../middleware/auth");

const router = express.Router();

// ALL portal routes require a customer JWT.
// An internal JWT (Sales Rep / Manager / Admin) will be rejected with 401.

// GET /api/portal/quotations
router.get("/quotations", requireCustomerAuth, controller.listQuotations);

// GET /api/portal/quotations/:id
router.get("/quotations/:id", requireCustomerAuth, controller.getQuotation);

// GET /api/portal/quotations/:id/events
router.get("/quotations/:id/events", requireCustomerAuth, controller.getNegotiationEvents);

// PART 4: Line comments
// POST /api/portal/quotations/:id/comments
router.post("/quotations/:id/comments", requireCustomerAuth, controller.addComment);

// PART 4: Line change requests
// POST /api/portal/quotations/:id/change-requests
router.post("/quotations/:id/change-requests", requireCustomerAuth, controller.addChangeRequest);

// PARTS 5, 6, 7, 8: Customer counter-offer
// POST /api/portal/quotations/:id/counter-offer
router.post("/quotations/:id/counter-offer", requireCustomerAuth, controller.submitCounterOffer);

// PART 9: Customer confirms quotation
// POST /api/portal/quotations/:id/confirm
router.post("/quotations/:id/confirm", requireCustomerAuth, controller.confirmQuotation);

module.exports = router;
