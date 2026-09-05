const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding baseline configuration data...");

  // --- Customer tiers (Bronze/Silver/Gold from the PS example) ---
  const [bronze, silver, gold] = await Promise.all([
    prisma.customerTier.upsert({
      where: { name: "BRONZE" },
      update: {},
      create: { name: "BRONZE", defaultDiscountCeiling: 5 },
    }),

    prisma.customerTier.upsert({
      where: { name: "SILVER" },
      update: {},
      create: { name: "SILVER", defaultDiscountCeiling: 10 },
    }),

    prisma.customerTier.upsert({
      where: { name: "GOLD" },
      update: {},
      create: { name: "GOLD", defaultDiscountCeiling: 15 },
    }),
  ]);

  // --- Product categories with their own discount ceilings ---
  const hardware = await prisma.productCategory.upsert({
    where: { name: "Hardware" },
    update: {},
    create: {
      name: "Hardware",
      discountCeiling: 15,
    },
  });

  const services = await prisma.productCategory.upsert({
    where: { name: "Services" },
    update: {},
    create: {
      name: "Services",
      discountCeiling: 10,
    },
  });

  const subscriptions = await prisma.productCategory.upsert({
    where: { name: "Subscriptions" },
    update: {},
    create: {
      name: "Subscriptions",
      discountCeiling: 10,
    },
  });

  // --- Subscription product ---
  const enterpriseSupport = await prisma.product.upsert({
    where: {
      id: "seed-enterprise-support",
    },
    update: {},
    create: {
      id: "seed-enterprise-support",
      name: "Enterprise IT Support",
      description:
        "Recurring enterprise technical support and maintenance service",
      categoryId: subscriptions.id,
      basePrice: 12000,
      unit: "month",
      taxRatePct: 18,
      costPrice: 6000,
      isSubscription: true,
      active: true,
    },
  });

  // --- Monthly subscription plan ---
  await prisma.subscriptionPlan.upsert({
    where: {
      id: "seed-enterprise-support-monthly",
    },
    update: {},
    create: {
      id: "seed-enterprise-support-monthly",
      productId: enterpriseSupport.id,
      frequency: "MONTHLY",
      price: 12000,
      prorationRule: "DAILY_PRORATION",
      cancellationRule: "END_OF_CYCLE",
      refundRule: "PRORATED_PARTIAL",
    },
  });

  // --- Approval routing rules ---
  await prisma.approvalRule.upsert({
    where: { riskLevel: "LOW" },
    update: {},
    create: {
      riskLevel: "LOW",
      requiredSteps: [],
      minScore: 0,
      maxScore: 20,
    },
  });

  await prisma.approvalRule.upsert({
    where: { riskLevel: "MEDIUM" },
    update: {},
    create: {
      riskLevel: "MEDIUM",
      requiredSteps: ["SALES_MANAGER"],
      minScore: 20,
      maxScore: 60,
    },
  });

  await prisma.approvalRule.upsert({
    where: { riskLevel: "HIGH" },
    update: {},
    create: {
      riskLevel: "HIGH",
      requiredSteps: ["SALES_MANAGER", "FINANCE_OPS"],
      minScore: 60,
      maxScore: 100,
    },
  });

  // --- Admin user so the very first login works ---
  const adminPasswordHash = await bcrypt.hash("Admin@12345", 10);

  await prisma.user.upsert({
    where: { email: "admin@dealflow360.test" },
    update: {},
    create: {
      name: "Platform Admin",
      email: "admin@dealflow360.test",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  // --- Sample warehouse (from PS: "Main Warehouse", "East Depot") ---
  await prisma.warehouse.upsert({
    where: { id: "seed-main-warehouse" },
    update: {},
    create: {
      id: "seed-main-warehouse",
      name: "Main Warehouse",
      location: "Bangalore",
      shippingCostWeight: 1.0,
    },
  });

  await prisma.warehouse.upsert({
    where: { id: "seed-east-depot" },
    update: {},
    create: {
      id: "seed-east-depot",
      name: "East Depot",
      location: "Chennai",
      shippingCostWeight: 1.4,
    },
  });

  console.log("Seed complete.");
  console.log("Login with: admin@dealflow360.test / Admin@12345");
  console.log(
    "Subscription product created: Enterprise IT Support - ₹12,000/month"
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });