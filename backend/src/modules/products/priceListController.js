const { z } = require("zod");
const priceListService = require("./priceListService");

const createPriceListSchema = z.object({
  productId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  tierName: z.enum(["BRONZE", "SILVER", "GOLD"]).optional(),
  currency: z.string().min(3).max(3).optional(),
  price: z.number().nonnegative(),
});

async function listPriceListEntries(req, res, next) {
  try {
    const entries = await priceListService.listPriceListEntries();
    res.json({ entries });
  } catch (error) {
    next(error);
  }
}

async function getPriceListEntry(req, res, next) {
  try {
    const entry = await priceListService.getPriceListEntryById(
      req.params.id
    );

    res.json({ entry });
  } catch (error) {
    next(error);
  }
}

async function createPriceListEntry(req, res, next) {
  try {
    const data = createPriceListSchema.parse(req.body);

    const entry = await priceListService.createPriceListEntry(data);

    res.status(201).json({ entry });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listPriceListEntries,
  getPriceListEntry,
  createPriceListEntry,
};
