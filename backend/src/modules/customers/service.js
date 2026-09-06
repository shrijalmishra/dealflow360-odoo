const prisma = require("../../config/db");

async function listCustomers() {
  return prisma.customer.findMany({
    include: {
      tier: true,
      assignedRep: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

async function getCustomerById(id) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      tier: true,
      assignedRep: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!customer) {
    const error = new Error("Customer not found");
    error.statusCode = 404;
    throw error;
  }

  return customer;
}

async function listCustomerTiers() {
  return prisma.customerTier.findMany({
    orderBy: {
      name: "asc",
    },
  });
}

async function createCustomer(data) {
  const {
    name,
    tierId,
    currency,
    assignedRepId,
  } = data;

  const tier = await prisma.customerTier.findUnique({
    where: { id: tierId },
  });

  if (!tier) {
    const error = new Error("Customer tier not found");
    error.statusCode = 400;
    throw error;
  }

  if (assignedRepId) {
    const assignedRep = await prisma.user.findUnique({
      where: { id: assignedRepId },
    });

    if (!assignedRep) {
      const error = new Error("Assigned sales representative not found");
      error.statusCode = 400;
      throw error;
    }
  }

  return prisma.customer.create({
    data: {
      name,
      tierId,
      currency: currency || "INR",
      assignedRepId: assignedRepId || null,
    },
    include: {
      tier: true,
      assignedRep: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
}

module.exports = {
  listCustomers,
  getCustomerById,
  listCustomerTiers,
  createCustomer,
};