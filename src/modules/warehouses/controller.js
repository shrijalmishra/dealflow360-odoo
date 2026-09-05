const warehouseService = require("./service");

async function listWarehouses(req, res, next) {
  try {
    const warehouses =
      await warehouseService.listWarehouses();

    res.json({
      warehouses,
    });
  } catch (error) {
    next(error);
  }
}

async function getWarehouseById(req, res, next) {
  try {
    const warehouse =
      await warehouseService.getWarehouseById(
        req.params.id
      );

    res.json({
      warehouse,
    });
  } catch (error) {
    next(error);
  }
}

async function getProductInventory(req, res, next) {
  try {
    const inventory =
      await warehouseService.getProductInventory(
        req.params.productId
      );

    res.json({
      inventory,
    });
  } catch (error) {
    next(error);
  }
}

async function calculateQuotationAllocation(
  req,
  res,
  next
) {
  try {
    const result =
      await warehouseService.calculateQuotationAllocation(
        req.params.quotationId
      );

    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function createFulfillment(req, res, next) {
  try {
    const fulfillment =
      await warehouseService.createFulfillment(
        req.params.quotationId
      );

    res.status(201).json({
      message: "Fulfillment created successfully",
      fulfillment,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listWarehouses,
  getWarehouseById,
  getProductInventory,
  calculateQuotationAllocation,
  createFulfillment,
};