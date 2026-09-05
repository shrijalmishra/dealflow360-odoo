const { z } = require("zod");
const productService = require("./service");

const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string().uuid(),
  basePrice: z.number().nonnegative(),
  unit: z.string().optional(),
  taxRatePct: z.number().min(0).max(100).optional(),
  costPrice: z.number().nonnegative().optional(),
  isSubscription: z.boolean().optional(),
});

async function listProducts(req, res, next) {
  try {
    const products = await productService.listProducts();

    res.json({
      products,
    });
  } catch (error) {
    next(error);
  }
}

async function getProduct(req, res, next) {
  try {
    const product = await productService.getProductById(req.params.id);

    res.json({
      product,
    });
  } catch (error) {
    next(error);
  }
}

async function createProduct(req, res, next) {
  try {
    const data = createProductSchema.parse(req.body);

    const product = await productService.createProduct(data);

    res.status(201).json({
      product,
    });
  } catch (error) {
    next(error);
  }
}

const createVariantSchema = z.object({
  attribute: z.string().min(1),
  value: z.string().min(1),
  extraPrice: z.number().nonnegative().optional(),
});

async function createVariant(req, res, next) {
  try {
    const data = createVariantSchema.parse(req.body);

    const variant = await productService.createVariant(
      req.params.productId,
      data
    );

    res.status(201).json({
      variant,
    });
  } catch (error) {
    next(error);
  }
}

async function listVariants(req, res, next) {
  try {
    const variants = await productService.listVariants(
      req.params.productId
    );

    res.json({
      variants,
    });
  } catch (error) {
    next(error);
  }
}

async function listCategories(req, res, next) {
  try {
    const categories = await productService.listCategories();

    res.json({
      categories,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  listCategories,
  createVariant,
  listVariants,
};