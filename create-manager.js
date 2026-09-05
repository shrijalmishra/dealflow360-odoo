const bcrypt = require("bcryptjs");
const prisma = require("./src/config/db");

async function main() {
  const passwordHash = await bcrypt.hash("Manager@12345", 10);

  const manager = await prisma.user.upsert({
    where: {
      email: "manager@dealflow360.test",
    },
    update: {
      role: "SALES_MANAGER",
    },
    create: {
      name: "Sales Manager",
      email: "manager@dealflow360.test",
      passwordHash,
      role: "SALES_MANAGER",
    },
  });

  console.log("Sales Manager created:");
  console.log({
    id: manager.id,
    name: manager.name,
    email: manager.email,
    role: manager.role,
  });

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});