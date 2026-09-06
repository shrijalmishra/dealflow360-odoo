const discountRiskService = require("./service");

async function assessQuotationRisk(req, res, next) {
  try {
    const result =
      await discountRiskService.assessQuotationRisk(
        req.params.quotationId
      );

    res.json({
      message: "Quotation risk assessed successfully",
      riskAssessment: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getGovernanceConfig(req, res, next) {
  try {
    const config = await discountRiskService.getGovernanceConfig();
    res.json(config);
  } catch (error) {
    next(error);
  }
}

async function updateGovernanceConfig(req, res, next) {
  try {
    const updated = await discountRiskService.updateGovernanceConfig(req.body);
    res.json({
      message: "Governance configuration updated successfully",
      ...updated,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  assessQuotationRisk,
  getGovernanceConfig,
  updateGovernanceConfig,
};