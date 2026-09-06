const { z } = require("zod");
const quotationService = require("./service");

const quotationLineSchema = z.object({
  // Product IDs are String in the Prisma schema,
  // so they do not have to be UUIDs.
  productId: z.string().min(1),

  quantity: z.number().int().positive(),

  discountPct: z
    .number()
    .min(0)
    .max(100)
    .optional(),

  lineType: z
    .enum(["ONE_TIME", "RECURRING"])
    .optional(),

  fromRecommendation: z
    .boolean()
    .optional(),
});

const createQuotationSchema = z.object({
  customerId: z.string().uuid(),

  repId: z.string().uuid(),

  lines: z
    .array(quotationLineSchema)
    .min(1),
});

async function createQuotation(req, res, next) {
  try {
    const data = createQuotationSchema.parse(req.body);

    const quotation =
      await quotationService.createQuotation(data);

    res.status(201).json({
      message: "Quotation created successfully",
      quotation,
    });
  } catch (error) {
    next(error);
  }
}

async function getQuotationTotals(req, res, next) {
  try {
    const quotation =
      await quotationService.getQuotationTotals(
        req.params.id
      );

    res.json({
      quotation,
    });
  } catch (error) {
    next(error);
  }
}

async function getQuotationById(req, res, next) {
  try {
    const quotation =
      await quotationService.getQuotationById(
        req.params.id
      );

    res.json({
      quotation,
    });
  } catch (error) {
    next(error);
  }
}

async function sendToCustomer(req, res, next) {
  try {
    const quotation = await quotationService.sendToCustomer(req.params.id);
    res.json({
      message: "Quotation sent to customer successfully",
      quotation,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createQuotation,
  getQuotationTotals,
  getQuotationById,
  sendToCustomer,
};