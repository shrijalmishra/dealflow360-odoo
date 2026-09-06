const prisma = require("../../config/db");

/**
 * Get all warehouses with their inventory.
 */
async function listWarehouses() {
  return prisma.warehouse.findMany({
    include: {
      inventory: {
        include: {
          product: true,
        },
      },
    },
    orderBy: {
      shippingCostWeight: "asc",
    },
  });
}

/**
 * Get one warehouse with its inventory.
 */
async function getWarehouseById(warehouseId) {
  const warehouse = await prisma.warehouse.findUnique({
    where: {
      id: warehouseId,
    },
    include: {
      inventory: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!warehouse) {
    const error = new Error("Warehouse not found");
    error.statusCode = 404;
    throw error;
  }

  return warehouse;
}

/**
 * Get inventory for a specific product across all warehouses.
 */
async function getProductInventory(productId) {
  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
  });

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  return prisma.warehouseInventory.findMany({
    where: {
      productId,
    },
    include: {
      warehouse: true,
      product: true,
    },
    orderBy: {
      warehouse: {
        shippingCostWeight: "asc",
      },
    },
  });
}

/**
 * Allocate a requested quantity across warehouses.
 *
 * Strategy:
 * 1. Prefer warehouses with lower shipping cost.
 * 2. Use as much available stock as possible.
 * 3. Split across warehouses when one warehouse cannot satisfy
 *    the complete quantity.
 * 4. Return remaining quantity as backorder quantity.
 *
 * This function only calculates the allocation.
 * It does NOT modify database inventory.
 */
function calculateAllocation(inventory, requestedQty) {
  if (!Number.isInteger(requestedQty) || requestedQty <= 0) {
    const error = new Error(
      "Requested quantity must be a positive integer"
    );
    error.statusCode = 400;
    throw error;
  }

  let remainingQty = requestedQty;

  const allocations = [];

  // Inventory is already ordered by shipping cost,
  // but sorting again keeps this function safe if called directly.
  const sortedInventory = [...inventory].sort(
    (a, b) =>
      a.warehouse.shippingCostWeight -
      b.warehouse.shippingCostWeight
  );

  for (const stock of sortedInventory) {
    if (remainingQty <= 0) {
      break;
    }

    const availableQty = Math.max(
      0,
      stock.availableQty
    );

    if (availableQty === 0) {
      continue;
    }

    const allocatedQty = Math.min(
      availableQty,
      remainingQty
    );

    allocations.push({
      warehouseId: stock.warehouseId,
      warehouseName: stock.warehouse.name,
      productId: stock.productId,
      quantity: allocatedQty,
      shippingCostWeight:
        stock.warehouse.shippingCostWeight,
    });

    remainingQty -= allocatedQty;
  }

  return {
    requestedQty,
    allocatedQty: requestedQty - remainingQty,
    backorderQty: remainingQty,
    allocations,
  };
}

/**
 * Calculate the complete allocation plan for an approved quotation.
 *
 * No database changes are made here.
 */
async function calculateQuotationAllocation(
  quotationId
) {
  const quotation = await prisma.quotation.findUnique({
    where: {
      id: quotationId,
    },
    include: {
      customer: true,
      versions: {
        orderBy: {
          versionNumber: "desc",
        },
        take: 1,
        include: {
          lines: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  });

  if (!quotation) {
    const error = new Error("Quotation not found");
    error.statusCode = 404;
    throw error;
  }

  const disallowedStatuses = ["REJECTED", "CANCELLED", "EXPIRED"];
  if (disallowedStatuses.includes(quotation.status)) {
    const error = new Error(
      `Quotation in status ${quotation.status} cannot be allocated for fulfillment`
    );
    error.statusCode = 400;
    throw error;
  }

  const version = quotation.versions[0];

  if (!version) {
    const error = new Error(
      "Quotation has no version"
    );
    error.statusCode = 400;
    throw error;
  }

  const allocationPlan = [];

  for (const line of version.lines) {
    const inventory =
      await prisma.warehouseInventory.findMany({
        where: {
          productId: line.productId,
        },
        include: {
          warehouse: true,
        },
        orderBy: {
          warehouse: {
            shippingCostWeight: "asc",
          },
        },
      });

    const allocation = calculateAllocation(
      inventory,
      line.quantity
    );

    allocationPlan.push({
      quotationLineId: line.id,
      productId: line.productId,
      productName: line.product.name,
      requestedQty: line.quantity,
      allocatedQty: allocation.allocatedQty,
      backorderQty: allocation.backorderQty,
      allocations: allocation.allocations,
    });
  }

  const totalRequested = allocationPlan.reduce(
    (sum, item) => sum + item.requestedQty,
    0
  );

  const totalAllocated = allocationPlan.reduce(
    (sum, item) => sum + item.allocatedQty,
    0
  );

  const totalBackorder = allocationPlan.reduce(
    (sum, item) => sum + item.backorderQty,
    0
  );

  let fulfillmentStatus = "PENDING";

  if (totalBackorder === 0) {
    fulfillmentStatus = "FULFILLED";
  } else if (totalAllocated > 0) {
    fulfillmentStatus = "PARTIALLY_FULFILLED";
  } else {
    fulfillmentStatus = "BACKORDERED";
  }

  // Calculate distinct warehouses involved to compute shipment count and freight cost
  const warehouseMap = new Map();
  for (const item of allocationPlan) {
    for (const alloc of item.allocations || []) {
      if (!warehouseMap.has(alloc.warehouseId)) {
        warehouseMap.set(alloc.warehouseId, {
          warehouseId: alloc.warehouseId,
          warehouseName: alloc.warehouseName,
          shippingCostWeight: alloc.shippingCostWeight || 1.0,
          totalUnits: alloc.quantity,
        });
      } else {
        warehouseMap.get(alloc.warehouseId).totalUnits += alloc.quantity;
      }
    }
  }

  const BASELINE_SHIPMENT_FEE = 1500; // INR baseline carrier fee per shipment
  const estimatedShipmentCount = warehouseMap.size;
  let estimatedShipmentCost = 0;
  for (const w of warehouseMap.values()) {
    estimatedShipmentCost += BASELINE_SHIPMENT_FEE * w.shippingCostWeight;
  }

  return {
    quotationId,
    versionNumber: version.versionNumber,
    totalRequested,
    totalAllocated,
    totalBackorder,
    fulfillmentStatus,
    estimatedShipmentCount,
    estimatedShipmentCost,
    depotSplits: Array.from(warehouseMap.values()),
    lines: allocationPlan,
  };
}

async function createWarehouse({ name, location, shippingCostWeight }) {
  if (!name || !name.trim()) {
    const error = new Error("Warehouse name is required");
    error.statusCode = 400;
    throw error;
  }

  return prisma.warehouse.create({
    data: {
      name: name.trim(),
      location: location || null,
      shippingCostWeight: shippingCostWeight !== undefined ? parseFloat(shippingCostWeight) : 1.0,
    },
    include: {
      inventory: {
        include: {
          product: true,
        },
      },
    },
  });
}

async function updateWarehouse(id, { name, location, shippingCostWeight }) {
  return prisma.warehouse.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(location !== undefined && { location }),
      ...(shippingCostWeight !== undefined && { shippingCostWeight: parseFloat(shippingCostWeight) }),
    },
    include: {
      inventory: {
        include: {
          product: true,
        },
      },
    },
  });
}

async function updateInventoryStock(warehouseId, productId, { availableQty, reorderLevel }) {
  return prisma.warehouseInventory.upsert({
    where: {
      warehouseId_productId: {
        warehouseId,
        productId,
      },
    },
    update: {
      ...(availableQty !== undefined && { availableQty: parseInt(availableQty, 10) }),
      ...(reorderLevel !== undefined && { reorderLevel: parseInt(reorderLevel, 10) }),
    },
    create: {
      warehouseId,
      productId,
      availableQty: availableQty !== undefined ? parseInt(availableQty, 10) : 0,
      reorderLevel: reorderLevel !== undefined ? parseInt(reorderLevel, 10) : 0,
    },
    include: {
      warehouse: true,
      product: true,
    },
  });
}

module.exports = {
  listWarehouses,
  getWarehouseById,
  getProductInventory,
  calculateAllocation,
  calculateQuotationAllocation,
  createFulfillment,
  createWarehouse,
  updateWarehouse,
  updateInventoryStock,
};

async function createFulfillment(quotationId) {
  const quotation = await prisma.quotation.findUnique({
    where: {
      id: quotationId,
    },
    include: {
      versions: {
        orderBy: {
          versionNumber: "desc",
        },
        take: 1,
        include: {
          lines: {
            include: {
              product: true,
            },
          },
        },
      },
      fulfillments: true,
    },
  });

  if (!quotation) {
    const error = new Error("Quotation not found");
    error.statusCode = 404;
    throw error;
  }

  const fulfillableStatuses = [
    "APPROVED",
    "SENT_TO_CUSTOMER",
    "CUSTOMER_CONFIRMED",
    "ORDER_CREATED",
    "FULFILLMENT",
  ];
  if (!fulfillableStatuses.includes(quotation.status)) {
    const error = new Error(
      "Only approved or confirmed quotations can be fulfilled"
    );
    error.statusCode = 400;
    throw error;
  }

  if (quotation.fulfillments.length > 0) {
    const error = new Error(
      "Fulfillment already exists for this quotation"
    );
    error.statusCode = 400;
    throw error;
  }

  const version = quotation.versions[0];

  if (!version) {
    const error = new Error(
      "Quotation has no version"
    );
    error.statusCode = 400;
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    const allocationPlan = [];

    for (const line of version.lines) {
      const inventory =
        await tx.warehouseInventory.findMany({
          where: {
            productId: line.productId,
          },
          include: {
            warehouse: true,
          },
        });

      const allocation = calculateAllocation(
        inventory,
        line.quantity
      );

      allocationPlan.push({
        quotationLineId: line.id,
        productId: line.productId,
        productName: line.product.name,
        requestedQty: line.quantity,
        allocatedQty: allocation.allocatedQty,
        backorderQty: allocation.backorderQty,
        allocations: allocation.allocations,
      });
    }

    const totalAllocated = allocationPlan.reduce(
      (sum, item) => sum + item.allocatedQty,
      0
    );

    const totalBackorder = allocationPlan.reduce(
      (sum, item) => sum + item.backorderQty,
      0
    );

    let fulfillmentStatus = "PENDING";

    if (totalBackorder > 0 && totalAllocated > 0) {
      fulfillmentStatus =
        "PARTIALLY_FULFILLED";
    } else if (
      totalBackorder > 0 &&
      totalAllocated === 0
    ) {
      fulfillmentStatus = "BACKORDERED";
    }

    const fulfillment = await tx.fulfillment.create({
      data: {
        quotationId,
        status: fulfillmentStatus,
      },
    });

    for (const line of allocationPlan) {
      for (const allocation of line.allocations) {
        await tx.fulfillmentAllocation.create({
          data: {
            fulfillmentId: fulfillment.id,
            warehouseId: allocation.warehouseId,
            productId: allocation.productId,
            quantity: allocation.quantity,
            manualOverride: false,
          },
        });

        const stock =
          await tx.warehouseInventory.findUnique({
            where: {
              warehouseId_productId: {
                warehouseId:
                  allocation.warehouseId,
                productId:
                  allocation.productId,
              },
            },
          });

        if (!stock) {
          const error = new Error(
            "Warehouse inventory record not found"
          );
          error.statusCode = 400;
          throw error;
        }

        if (
          stock.availableQty <
          allocation.quantity
        ) {
          const error = new Error(
            `Insufficient stock in warehouse ${allocation.warehouseId}`
          );
          error.statusCode = 400;
          throw error;
        }

        await tx.warehouseInventory.update({
          where: {
            warehouseId_productId: {
              warehouseId:
                allocation.warehouseId,
              productId:
                allocation.productId,
            },
          },
          data: {
            availableQty: {
              decrement: allocation.quantity,
            },
            reservedQty: {
              increment: allocation.quantity,
            },
          },
        });
      }

      if (line.backorderQty > 0) {
        await tx.backorder.create({
          data: {
            fulfillmentId: fulfillment.id,
            productId: line.productId,
            qtyPending: line.backorderQty,
          },
        });
      }
    }

    await tx.quotation.update({
      where: {
        id: quotationId,
      },
      data: {
        status: "FULFILLMENT",
        lastActivityAt: new Date(),
      },
    });

    return tx.fulfillment.findUnique({
      where: {
        id: fulfillment.id,
      },
      include: {
        allocations: {
          include: {
            warehouse: true,
          },
        },
        backorders: true,
        quotation: true,
      },
    });
  });
}

module.exports = {
  listWarehouses,
  getWarehouseById,
  getProductInventory,
  calculateAllocation,
  calculateQuotationAllocation,
  createFulfillment,
};