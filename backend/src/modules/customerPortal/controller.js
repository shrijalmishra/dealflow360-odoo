const portalService = require("./service");
const negotiationService = require("../negotiation/service");

async function listQuotations(req, res, next) {
  try {
    const quotations = await portalService.listCustomerQuotations(
      req.customer.customerId
    );
    res.json({ quotations });
  } catch (err) {
    next(err);
  }
}

async function getQuotation(req, res, next) {
  try {
    const quotation = await portalService.getCustomerQuotationById(
      req.customer.customerId,
      req.params.id
    );
    res.json({ quotation });
  } catch (err) {
    next(err);
  }
}

// PART 4: Add comment
async function addComment(req, res, next) {
  try {
    const event = await negotiationService.addComment({
      quotationId: req.params.id,
      actor: req.customer.email || `customer:${req.customer.customerId}`,
      lineId: req.body.lineId,
      comment: req.body.comment,
      isCustomer: true,
      customerId: req.customer.customerId,
    });
    res.status(201).json({ message: "Comment added", event });
  } catch (err) {
    next(err);
  }
}

// PART 4: Add change request
async function addChangeRequest(req, res, next) {
  try {
    const event = await negotiationService.addChangeRequest({
      quotationId: req.params.id,
      actor: req.customer.email || `customer:${req.customer.customerId}`,
      lineId: req.body.lineId,
      requestedQuantity: req.body.requestedQuantity,
      requestedDiscountPct: req.body.requestedDiscountPct,
      notes: req.body.notes,
      isCustomer: true,
      customerId: req.customer.customerId,
    });
    res.status(201).json({ message: "Change request submitted", event });
  } catch (err) {
    next(err);
  }
}

// PARTS 5, 6, 7, 8: Submit counter-discount offer
async function submitCounterOffer(req, res, next) {
  try {
    const result = await negotiationService.submitCounterOffer({
      quotationId: req.params.id,
      actor: req.customer.email || `customer:${req.customer.customerId}`,
      lines: req.body.lines,
      notes: req.body.notes,
      isCustomer: true,
      customerId: req.customer.customerId,
    });
    res.status(200).json({
      message: "Counter-offer submitted successfully",
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

// PART 9: Confirm quotation
async function confirmQuotation(req, res, next) {
  try {
    const result = await negotiationService.confirmQuotation({
      quotationId: req.params.id,
      actor: req.customer.email || `customer:${req.customer.customerId}`,
      isCustomer: true,
      customerId: req.customer.customerId,
    });
    res.status(200).json({
      message: "Quotation confirmed successfully",
      quotationId: result.quotation.id,
      status: "Confirmed",
      internalStatus: result.quotation.status,
    });
  } catch (err) {
    next(err);
  }
}

// Get negotiation events
async function getNegotiationEvents(req, res, next) {
  try {
    const events = await negotiationService.getNegotiationEvents(
      req.params.id,
      req.customer.customerId
    );
    res.json({ events });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listQuotations,
  getQuotation,
  addComment,
  addChangeRequest,
  submitCounterOffer,
  confirmQuotation,
  getNegotiationEvents,
};
