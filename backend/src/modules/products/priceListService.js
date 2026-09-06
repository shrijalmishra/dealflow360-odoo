const prisma = require("../../config/db");

async function listPriceListEntries() {
  return prisma.priceListEntry.findMany({
    include: {
      product: true,
      customer: true,
    },
    orderBy: {
      id: "desc",
    },
  });
}

async function getPriceListEntryById(id) {
  const entry = await prisma.priceListEntry.findUnique({
    where: { id },
    include: {
      product: true,
      customer: true,
    },
  });

  if (!entry) {
    const error = new Error("Price list entry not found");
    error.statusCode = 404;
    throw error;
  }

  return entry;
}

async function createPriceListEntry(data) {
  const {
    productId,
    customerId,
    tierName,
    currency,
    price,
  } = data;

  // Make sure the product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 400;
    throw error;
  }

  // If customerId is provided, make sure customer exists
  if (customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      const error = new Error("Customer not found");
      error.statusCode = 400;
      throw error;
    }
  }

  // If tierName is provided, make sure the tier exists
  if (tierName) {
    const tier = await prisma.customerTier.findUnique({
      where: { name: tierName },
    });

    if (!tier) {
      const error = new Error("Customer tier not found");
      error.statusCode = 400;
      throw error;
    }
  }

  return prisma.priceListEntry.create({
    data: {
      productId,
      customerId: customerId || null,
      tierName: tierName || null,
      currency: currency || "INR",
      price,
    },
    include: {
      product: true,
      customer: true,
    },
  });
}

module.exports = {
  listPriceListEntries,
  getPriceListEntryById,
  createPriceListEntry,
};