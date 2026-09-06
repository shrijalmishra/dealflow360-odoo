const recommendationService = require("./service");

async function getQuotationRecommendations(req, res, next) {
  try {
    const recommendations =
      await recommendationService.getRecommendationsForQuotation(
        req.params.quotationId
      );
    res.json({
      quotationId: req.params.quotationId,
      count: recommendations.length,
      recommendations,
    });
  } catch (err) {
    next(err);
  }
}

async function getProductRecommendations(req, res, next) {
  try {
    const recommendations =
      await recommendationService.getRecommendationsForProduct(
        req.params.productId,
        req.query.customerId
      );
    res.json({
      productId: req.params.productId,
      count: recommendations.length,
      recommendations,
    });
  } catch (err) {
    next(err);
  }
}

async function acceptRecommendation(req, res, next) {
  try {
    const result = await recommendationService.acceptRecommendation({
      quotationId: req.params.quotationId,
      productId: req.body.productId,
      quantity: req.body.quantity,
      discountPct: req.body.discountPct,
      userId: req.user.id,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function configureCoPurchase(req, res, next) {
  try {
    const stat = await recommendationService.configureCoPurchase(req.body);
    res.status(201).json({
      message: "Co-purchase relationship configured",
      stat,
    });
  } catch (err) {
    next(err);
  }
}

async function configurePromotion(req, res, next) {
  try {
    const flag = await recommendationService.configurePromotion(req.body);
    res.status(201).json({
      message: "Promotion flag configured",
      flag,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getQuotationRecommendations,
  getProductRecommendations,
  acceptRecommendation,
  configureCoPurchase,
  configurePromotion,
};
