const prisma = require("./src/config/db");

async function main() {
  const productId =
    "e04255a1-ad60-4fe8-86ae-71f6f4638396";

  const inventory = [
    {
      warehouseId: "seed-main-warehouse",
      productId,
      availableQty: 6,
      reservedQty: 0,
      reorderLevel: 2,
    },
    {
      warehouseId: "seed-east-depot",
      productId,
      availableQty: 8,
      reservedQty: 0,
      reorderLevel: 2,
    },
  ];

  for (const item of inventory) {
    const result =
      await prisma.warehouseInventory.upsert({
        where: {
          warehouseId_productId: {
            warehouseId: item.warehouseId,
            productId: item.productId,
          },
        },
        update: {
          availableQty: item.availableQty,
          reservedQty: item.reservedQty,
          reorderLevel: item.reorderLevel,
        },
        create: item,
      });

    console.log({
      id: result.id,
      warehouseId: result.warehouseId,
      productId: result.productId,
      availableQty: result.availableQty,
      reservedQty: result.reservedQty,
    });
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});