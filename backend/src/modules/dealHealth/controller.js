const dealHealthService = require("./service");

async function getQuotationHealth(req, res, next) {
  try {
    const health = await dealHealthService.getQuotationHealth(
      req.params.quotationId,
      { persistAlerts: true }
    );
    res.json(health);
  } catch (err) {
    next(err);
  }
}

async function refreshQuotationHealth(req, res, next) {
  try {
    const health = await dealHealthService.getQuotationHealth(
      req.params.quotationId,
      { persistAlerts: true }
    );
    res.json({
      message: "Deal health recalculated and alerts synchronized",
      ...health,
    });
  } catch (err) {
    next(err);
  }
}

async function listAlerts(req, res, next) {
  try {
    const alerts = await dealHealthService.listAlerts(req.query);
    res.json({
      count: alerts.length,
      alerts,
    });
  } catch (err) {
    next(err);
  }
}

async function acknowledgeAlert(req, res, next) {
  try {
    const alert = await dealHealthService.acknowledgeAlert(
      req.params.id,
      req.user
    );
    res.json({
      message: "Alert acknowledged",
      alert,
    });
  } catch (err) {
    next(err);
  }
}

async function resolveAlert(req, res, next) {
  try {
    const alert = await dealHealthService.resolveAlert(
      req.params.id,
      req.user
    );
    res.json({
      message: "Alert resolved",
      alert,
    });
  } catch (err) {
    next(err);
  }
}

async function getSummary(req, res, next) {
  try {
    const summary = await dealHealthService.getDealHealthSummary();
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getQuotationHealth,
  refreshQuotationHealth,
  listAlerts,
  acknowledgeAlert,
  resolveAlert,
  getSummary,
};
