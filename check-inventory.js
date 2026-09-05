const prisma = require("./src/config/db");

async function main() {
  const inventory = await prisma.warehouseInventory.findMany({
    include: {
      warehouse: true,
      product: true,
    },
    orderBy: {
      warehouseId: "asc",
    },
  });

  console.log(JSON.stringify(inventory, null, 2));

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});