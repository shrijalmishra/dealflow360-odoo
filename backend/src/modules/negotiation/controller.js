const negotiationService = require("./service");

async function getEvents(req, res, next) {
  try {
    const events = await negotiationService.getNegotiationEvents(req.params.quotationId);
    res.json({ events });
  } catch (err) {
    next(err);
  }
}

async function addComment(req, res, next) {
  try {
    const event = await negotiationService.addComment({
      quotationId: req.params.quotationId,
      actor: `${req.user.role}:${req.user.name || req.user.email}`,
      lineId: req.body.lineId,
      comment: req.body.comment,
      isCustomer: false,
    });
    res.status(201).json({ message: "Internal comment added", event });
  } catch (err) {
    next(err);
  }
}

async function submitCounterOffer(req, res, next) {
  try {
    const result = await negotiationService.submitCounterOffer({
      quotationId: req.params.quotationId,
      actor: `${req.user.role}:${req.user.name || req.user.email}`,
      lines: req.body.lines,
      notes: req.body.notes,
      isCustomer: false,
    });
    res.status(200).json({
      message: "Counter-offer submitted successfully",
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getEvents,
  addComment,
  submitCounterOffer,
};
