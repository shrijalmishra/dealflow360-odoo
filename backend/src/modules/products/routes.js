const express = require("express");

const controller = require("./controller");

const { requireAuth } = require("../../middleware/auth");

const { requireRole } = require("../../middleware/rbac");

const router = express.Router();

router.get(
  "/",
  requireAuth,
  controller.listProducts
);

router.get(
  "/categories",
  requireAuth,
  controller.listCategories
);

router.get(
  "/:productId/variants",
  requireAuth,
  controller.listVariants
);

router.post(
  "/:productId/variants",
  requireAuth,
  requireRole("ADMIN"),
  controller.createVariant
);

router.get(
  "/price-lists",
  requireAuth,
  controller.listPriceLists
);

router.post(
  "/price-lists",
  requireAuth,
  requireRole("ADMIN"),
  controller.createPriceListEntry
);

router.delete(
  "/price-lists/:id",
  requireAuth,
  requireRole("ADMIN"),
  controller.deletePriceListEntry
);

router.get(
  "/:id",
  requireAuth,
  controller.getProduct
);

router.post(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  controller.createProduct
);

router.put(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  controller.updateProduct
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  controller.deleteProduct
);

module.exports = router;