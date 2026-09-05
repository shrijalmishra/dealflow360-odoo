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

module.exports = {
  assessQuotationRisk,
};