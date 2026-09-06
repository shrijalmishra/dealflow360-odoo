const prisma = require("../../config/db");

function addBillingPeriod(date, frequency) {
  const nextDate = new Date(date);

  if (frequency === "MONTHLY") {
    nextDate.setMonth(nextDate.getMonth() + 1);
  } else if (frequency === "QUARTERLY") {
    nextDate.setMonth(nextDate.getMonth() + 3);
  } else if (frequency === "YEARLY") {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
  } else {
    throw new Error("Unsupported billing frequency");
  }

  return nextDate;
}

function calculateRecurringAmount(line) {
  const grossAmount = line.unitPrice * line.quantity;

  const discountAmount =
    grossAmount * ((line.discountPct || 0) / 100);

  return Number((grossAmount - discountAmount).toFixed(2));
}

async function getRecurringQuotationLine(quotationId, planId) {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: {
      id: planId,
    },
    include: {
      product: true,
    },
  });

  if (!plan) {
    const error = new Error("Subscription plan not found");
    error.statusCode = 404;
    throw error;
  }

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

  const latestVersion = quotation.versions[0];

  if (!latestVersion) {
    const error = new Error("Quotation has no version");
    error.statusCode = 400;
    throw error;
  }

  const recurringLines = latestVersion.lines.filter(
    (line) => line.lineType === "RECURRING"
  );

  if (recurringLines.length === 0) {
    const error = new Error(
      "Quotation does not contain any recurring lines"
    );
    error.statusCode = 400;
    throw error;
  }

  const matchingLine = recurringLines.find(
    (line) => line.productId === plan.productId
  );

  if (!matchingLine) {
    const error = new Error(
      "Subscription plan does not match any recurring quotation line"
    );
    error.statusCode = 400;
    throw error;
  }

  if (!matchingLine.product.isSubscription) {
    const error = new Error(
      "The quoted product is not configured as a subscription product"
    );
    error.statusCode = 400;
    throw error;
  }

  return {
    quotation,
    plan,
    line: matchingLine,
  };
}

async function createSubscription({
  quotationId,
  planId,
  startDate = new Date(),
}) {
  const {
    quotation,
    plan,
    line,
  } = await getRecurringQuotationLine(
    quotationId,
    planId
  );

  const allowedStatuses = [
    "APPROVED",
    "CUSTOMER_CONFIRMED",
    "ORDER_CREATED",
    "FULFILLMENT",
    "PARTIALLY_FULFILLED",
    "FULFILLED",
    "INVOICED",
    "PARTIALLY_PAID",
    "PAID",
    ];

  if (!allowedStatuses.includes(quotation.status)) {
    const error = new Error(
      `Subscription cannot be created while quotation is in ${quotation.status} status`
    );
    error.statusCode = 400;
    throw error;
  }

  const existingSubscription =
    await prisma.subscription.findFirst({
      where: {
        quotationId,
        planId,
        status: "ACTIVE",
      },
    });

  if (existingSubscription) {
    const error = new Error(
      "An active subscription already exists for this quotation and plan"
    );
    error.statusCode = 409;
    throw error;
  }

  const actualStartDate = new Date(startDate);

  if (Number.isNaN(actualStartDate.getTime())) {
    const error = new Error("Invalid subscription start date");
    error.statusCode = 400;
    throw error;
  }

  const recurringAmount = calculateRecurringAmount(line);

  const nextBillingDate = addBillingPeriod(
    actualStartDate,
    plan.frequency
  );

  const subscription = await prisma.$transaction(
    async (tx) => {
      const createdSubscription =
        await tx.subscription.create({
          data: {
            quotationId,
            planId,
            startDate: actualStartDate,
            nextBillingDate,
            status: "ACTIVE",

            billingSchedules: {
              create: {
                dueDate: nextBillingDate,
                amount: recurringAmount,
                invoiced: false,
              },
            },
          },

          include: {
            plan: {
              include: {
                product: true,
              },
            },
            billingSchedules: true,
          },
        });

      await tx.quotation.update({
        where: {
          id: quotationId,
        },
        data: {
          lastActivityAt: new Date(),
        },
      });

      return createdSubscription;
    }
  );

  return {
    subscription,
    quotationId,
    productId: plan.productId,
    productName: plan.product.name,
    frequency: plan.frequency,
    recurringAmount,
    startDate: actualStartDate,
    nextBillingDate,
  };
}

async function getSubscriptionById(subscriptionId) {
  const subscription =
    await prisma.subscription.findUnique({
      where: {
        id: subscriptionId,
      },
      include: {
        plan: {
          include: {
            product: true,
          },
        },
        billingSchedules: {
          orderBy: {
            dueDate: "asc",
          },
        },
        creditNotes: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

  if (!subscription) {
    const error = new Error("Subscription not found");
    error.statusCode = 404;
    throw error;
  }

  // Enrich with customer info via quotationId
  if (subscription.quotationId) {
    const quotation = await prisma.quotation.findUnique({
      where: { id: subscription.quotationId },
      include: { customer: true },
    });
    subscription.quotation = quotation || null;
  }

  return subscription;
}

async function listSubscriptions() {
  const subs = await prisma.subscription.findMany({
    orderBy: {
      startDate: "desc",
    },
    include: {
      plan: {
        include: {
          product: true,
        },
      },
      billingSchedules: {
        orderBy: {
          dueDate: "asc",
        },
      },
    },
  });

  // Enrich each subscription with quotation + customer via quotationId
  const quotationIds = [...new Set(subs.map(s => s.quotationId).filter(Boolean))];
  const quotations = await prisma.quotation.findMany({
    where: { id: { in: quotationIds } },
    include: { customer: true },
  });
  const qMap = Object.fromEntries(quotations.map(q => [q.id, q]));

  return subs.map(s => ({
    ...s,
    quotation: qMap[s.quotationId] || null,
  }));
}

async function cancelSubscription(subscriptionId) {
  const subscription =
    await prisma.subscription.findUnique({
      where: {
        id: subscriptionId,
      },
      include: {
        plan: true,
      },
    });

  if (!subscription) {
    const error = new Error("Subscription not found");
    error.statusCode = 404;
    throw error;
  }

  if (subscription.status !== "ACTIVE") {
    const error = new Error(
      `Subscription is already ${subscription.status.toLowerCase()}`
    );
    error.statusCode = 400;
    throw error;
  }

  const cancellationRule =
    subscription.plan.cancellationRule;

  if (cancellationRule === "END_OF_CYCLE") {
    const updatedSubscription =
      await prisma.subscription.update({
        where: {
          id: subscriptionId,
        },
        data: {
          status: "CANCELLED",
        },
        include: {
          plan: {
            include: {
              product: true,
            },
          },
          billingSchedules: {
            orderBy: {
              dueDate: "asc",
            },
          },
        },
      });

    return updatedSubscription;
  }

  const updatedSubscription =
    await prisma.subscription.update({
      where: {
        id: subscriptionId,
      },
      data: {
        status: "CANCELLED",
      },
      include: {
        plan: {
          include: {
            product: true,
          },
        },
        billingSchedules: {
          orderBy: {
            dueDate: "asc",
          },
        },
      },
    });

  return updatedSubscription;
}

module.exports = {
  createSubscription,
  getSubscriptionById,
  listSubscriptions,
  cancelSubscription,
  calculateRecurringAmount,
  addBillingPeriod,
};