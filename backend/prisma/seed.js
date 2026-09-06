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

  // --- Internal users ---
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

  const managerPasswordHash = await bcrypt.hash("Manager@12345", 10);

  await prisma.user.upsert({
    where: { email: "manager@dealflow360.test" },
    update: {},
    create: {
      name: "Sales Manager",
      email: "manager@dealflow360.test",
      passwordHash: managerPasswordHash,
      role: "SALES_MANAGER",
    },
  });

  const repPasswordHash = await bcrypt.hash("Rep@12345", 10);

  await prisma.user.upsert({
    where: { email: "rep@dealflow360.test" },
    update: {},
    create: {
      name: "Sales Rep",
      email: "rep@dealflow360.test",
      passwordHash: repPasswordHash,
      role: "SALES_REP",
    },
  });

  const financePasswordHash = await bcrypt.hash("Finance@12345", 10);

  await prisma.user.upsert({
    where: { email: "finance@dealflow360.test" },
    update: {},
    create: {
      name: "Finance Ops",
      email: "finance@dealflow360.test",
      passwordHash: financePasswordHash,
      role: "FINANCE_OPS",
    },
  });

  // --- Acme Technologies (GOLD customer) ---
  const acme = await prisma.customer.upsert({
    where: { id: "bc6d7779-9478-49f1-b0b2-8ba35890de1a" },
    update: {},
    create: {
      id: "bc6d7779-9478-49f1-b0b2-8ba35890de1a",
      name: "Acme Technologies",
      tierId: gold.id,
      currency: "INR",
    },
  });

  // --- Customer portal user for Acme ---
  const customerPortalPasswordHash = await bcrypt.hash("Customer@12345", 10);

  await prisma.customerPortalUser.upsert({
    where: { email: "customer@acme.dealflow360.test" },
    update: {
      passwordHash: customerPortalPasswordHash,
      customerId: acme.id,
    },
    create: {
      email: "customer@acme.dealflow360.test",
      passwordHash: customerPortalPasswordHash,
      customerId: acme.id,
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

  // --- Upsell / Cross-sell Co-Purchase Statistics & Promotion Flags ---
  const dellLaptop = await prisma.product.findFirst({
    where: { name: { contains: "Dell" } },
  });
  const implService = await prisma.product.findFirst({
    where: { name: { contains: "Implementation" } },
  });

  if (dellLaptop && implService && enterpriseSupport) {
    // 1. Dell Laptop -> Implementation Service (Cross-sell, 0.85)
    await prisma.coPurchaseStat.upsert({
      where: {
        fromProductId_toProductId: {
          fromProductId: dellLaptop.id,
          toProductId: implService.id,
        },
      },
      update: { strengthScore: 0.85 },
      create: {
        fromProductId: dellLaptop.id,
        toProductId: implService.id,
        strengthScore: 0.85,
      },
    });

    // 2. Dell Laptop -> Enterprise IT Support (Cross-sell / recurring attachment, 0.70)
    await prisma.coPurchaseStat.upsert({
      where: {
        fromProductId_toProductId: {
          fromProductId: dellLaptop.id,
          toProductId: enterpriseSupport.id,
        },
      },
      update: { strengthScore: 0.70 },
      create: {
        fromProductId: dellLaptop.id,
        toProductId: enterpriseSupport.id,
        strengthScore: 0.70,
      },
    });

    // 3. Implementation Service -> Enterprise IT Support (0.60)
    await prisma.coPurchaseStat.upsert({
      where: {
        fromProductId_toProductId: {
          fromProductId: implService.id,
          toProductId: enterpriseSupport.id,
        },
      },
      update: { strengthScore: 0.60 },
      create: {
        fromProductId: implService.id,
        toProductId: enterpriseSupport.id,
        strengthScore: 0.60,
      },
    });

    // Promotional boost: Enterprise IT Support gets a 1.3x boost weight
    // Demonstrates explainable AI: 0.70 * 1.30 = 0.91 (boosted ahead of 0.85)
    await prisma.promotionFlag.upsert({
      where: { productId: enterpriseSupport.id },
      update: { active: true, boostWeight: 1.3 },
      create: {
        productId: enterpriseSupport.id,
        active: true,
        boostWeight: 1.3,
      },
    });
  }

  console.log("Seed complete.");
  console.log("Internal users:");
  console.log("  admin@dealflow360.test / Admin@12345  (ADMIN)");
  console.log("  manager@dealflow360.test / Manager@12345  (SALES_MANAGER)");
  console.log("  rep@dealflow360.test / Rep@12345  (SALES_REP)");
  console.log("Customer portal:");
  console.log("  customer@acme.dealflow360.test / Customer@12345  (Acme Technologies)");
  console.log("Subscription product created: Enterprise IT Support - ₹12,000/month");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });