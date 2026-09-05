const billingService = require("./service");

async function createOneTimeInvoice(req, res, next) {
  try {
    const invoice =
      await billingService.createOneTimeInvoice(
        req.params.quotationId
      );

    res.status(201).json({
      message: "One-time invoice created successfully",
      invoice,
    });
  } catch (error) {
    next(error);
  }
}

async function getInvoiceById(req, res, next) {
  try {
    const invoice =
      await billingService.getInvoiceById(
        req.params.id
      );

    res.json({
      invoice,
    });
  } catch (error) {
    next(error);
  }
}

async function listInvoices(req, res, next) {
  try {
    const invoices =
      await billingService.listInvoices();

    res.json({
      invoices,
    });
  } catch (error) {
    next(error);
  }
}

async function recordPayment(req, res, next) {
  try {
    const paymentResult =
      await billingService.recordPayment(
        req.params.invoiceId,
        {
          amount: Number(req.body.amount),
          method: req.body.method,
        }
      );

    res.status(201).json({
      message: "Payment recorded successfully",
      ...paymentResult,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createOneTimeInvoice,
  getInvoiceById,
  listInvoices,
  recordPayment,
};