const prisma = require("../../config/db");

async function listProducts() {
  return prisma.product.findMany({
    where: {
      active: true,
    },
    include: {
      category: true,
      variants: true,
      priceListEntries: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

async function getProductById(id) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      variants: true,
      priceListEntries: true,
    },
  });

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  return product;
}

async function createProduct(data) {
  const {
    name,
    description,
    categoryId,
    basePrice,
    unit,
    taxRatePct,
    costPrice,
    isSubscription,
  } = data;

  const category = await prisma.productCategory.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    const error = new Error("Product category not found");
    error.statusCode = 400;
    throw error;
  }

  return prisma.product.create({
    data: {
      name,
      description,
      categoryId,
      basePrice,
      unit: unit || "unit",
      taxRatePct: taxRatePct || 0,
      costPrice: costPrice || 0,
      isSubscription: isSubscription || false,
    },
    include: {
      category: true,
      variants: true,
      priceListEntries: true,
    },
  });
}

async function createVariant(productId, data) {
  const { attribute, value, extraPrice } = data;

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  return prisma.productVariant.create({
    data: {
      productId,
      attribute,
      value,
      extraPrice: extraPrice || 0,
    },
  });
}

async function listVariants(productId) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  return prisma.productVariant.findMany({
    where: {
      productId,
    },
    orderBy: {
      attribute: "asc",
    },
  });
}

async function updateProduct(id, data) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  const {
    name,
    description,
    categoryId,
    basePrice,
    unit,
    taxRatePct,
    costPrice,
    isSubscription,
  } = data;

  return prisma.product.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(categoryId !== undefined && { categoryId }),
      ...(basePrice !== undefined && { basePrice: Number(basePrice) }),
      ...(unit !== undefined && { unit }),
      ...(taxRatePct !== undefined && { taxRatePct: Number(taxRatePct) }),
      ...(costPrice !== undefined && { costPrice: Number(costPrice) }),
      ...(isSubscription !== undefined && { isSubscription: Boolean(isSubscription) }),
    },
    include: {
      category: true,
      variants: true,
      priceListEntries: true,
    },
  });
}

async function deleteProduct(id) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  return prisma.product.update({
    where: { id },
    data: { active: false },
  });
}

async function listPriceLists() {
  return prisma.priceListEntry.findMany({
    include: {
      product: {
        include: {
          category: true,
        },
      },
      customer: true,
    },
    orderBy: {
      tierName: "asc",
    },
  });
}

async function createPriceListEntry(data) {
  const { productId, tierName, customerId, currency = "INR", price } = data;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  return prisma.priceListEntry.create({
    data: {
      productId,
      tierName: tierName || null,
      customerId: customerId || null,
      currency,
      price: Number(price),
    },
    include: {
      product: true,
      customer: true,
    },
  });
}

async function deletePriceListEntry(id) {
  return prisma.priceListEntry.delete({
    where: { id },
  });
}

async function listCategories() {
  return prisma.productCategory.findMany({
    orderBy: {
      name: "asc",
    },
  });
}

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  listCategories,
  createVariant,
  listVariants,
  listPriceLists,
  createPriceListEntry,
  deletePriceListEntry,
};