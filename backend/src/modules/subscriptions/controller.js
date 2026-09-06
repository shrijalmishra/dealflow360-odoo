const subscriptionService = require("./service");

async function createSubscription(req, res, next) {
  try {
    const { quotationId, planId, startDate } = req.body;

    const result = await subscriptionService.createSubscription({
      quotationId,
      planId,
      startDate: startDate || new Date(),
    });

    res.status(201).json({
      message: "Subscription created successfully",
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

async function getSubscriptionById(req, res, next) {
  try {
    const subscription =
      await subscriptionService.getSubscriptionById(
        req.params.id
      );

    res.json({
      subscription,
    });
  } catch (error) {
    next(error);
  }
}

async function listSubscriptions(req, res, next) {
  try {
    const subscriptions =
      await subscriptionService.listSubscriptions();

    res.json({
      subscriptions,
    });
  } catch (error) {
    next(error);
  }
}

async function cancelSubscription(req, res, next) {
  try {
    const subscription =
      await subscriptionService.cancelSubscription(
        req.params.id
      );

    res.json({
      message: "Subscription cancelled successfully",
      subscription,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createSubscription,
  getSubscriptionById,
  listSubscriptions,
  cancelSubscription,
};