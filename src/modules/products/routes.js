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

module.exports = router;