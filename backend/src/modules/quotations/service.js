const prisma = require("../../config/db");

function calculateLineAmounts(line) {
  const grossAmount = line.unitPrice * line.quantity;

  const discountAmount =
    grossAmount * (line.discountPct / 100);

  const netAmount = grossAmount - discountAmount;

  return {
    grossAmount,
    discountAmount,
    netAmount,
  };
}

async function createQuotation({ customerId, repId, lines }) {
  // 1. Check that the customer exists
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      tier: true,
    },
  });

  if (!customer) {
    const error = new Error("Customer not found");
    error.statusCode = 400;
    throw error;
  }

  // 2. Check that the sales representative exists
  const rep = await prisma.user.findUnique({
    where: { id: repId },
  });

  if (!rep) {
    const error = new Error("Sales representative not found");
    error.statusCode = 400;
    throw error;
  }

  // 3. Make sure at least one product is present
  if (!lines || lines.length === 0) {
    const error = new Error("Quotation must contain at least one line");
    error.statusCode = 400;
    throw error;
  }

  // 4. Load all products used in the quotation
  const productIds = lines.map((line) => line.productId);

  const products = await prisma.product.findMany({
    where: {
      id: {
        in: productIds,
      },
      active: true,
    },
    include: {
      category: true,
    },
  });

  // 5. Make sure every requested product exists
  if (products.length !== productIds.length) {
    const foundProductIds = new Set(products.map((product) => product.id));

    const missingProducts = productIds.filter(
      (id) => !foundProductIds.has(id)
    );

    const error = new Error(
      `Product(s) not found: ${missingProducts.join(", ")}`
    );

    error.statusCode = 400;
    throw error;
  }

  // 6. Prepare quotation lines
  const quotationLines = lines.map((line) => {
    const product = products.find(
      (item) => item.id === line.productId
    );

    const quantity = line.quantity;
    const discountPct = line.discountPct || 0;

    return {
      productId: product.id,
      quantity,
      unitPrice: product.basePrice,
      discountPct,
      lineType: line.lineType || "ONE_TIME",

      // Capture the effective discount ceiling at quotation creation time
      // Blended governance: Stricter of customer tier ceiling and product category ceiling (PS Section 10)
      allowedDiscountPct: Math.min(
        customer.tier?.defaultDiscountCeiling ?? 100,
        product.category?.discountCeiling ?? 100
      ),

      fromRecommendation: line.fromRecommendation || false,
    };
  });

  // 7. Create quotation + Version 1 + lines
  const quotation = await prisma.quotation.create({
    data: {
      customerId,
      repId,

      status: "DRAFT",
      currentVersionNo: 1,

      versions: {
        create: {
          versionNumber: 1,

          lines: {
            create: quotationLines,
          },
        },
      },
    },

    include: {
      customer: {
        include: {
          tier: true,
        },
      },

      rep: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },

      versions: {
        include: {
          lines: {
            include: {
              product: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return quotation;
}

async function getQuotationTotals(quotationId) {
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
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

  const currentVersion = quotation.versions[0];

  if (!currentVersion) {
    const error = new Error("Quotation has no version");
    error.statusCode = 400;
    throw error;
  }

  let subtotal = 0;
  let totalDiscount = 0;
  let total = 0;

  const lines = currentVersion.lines.map((line) => {
    const amounts = calculateLineAmounts(line);

    subtotal += amounts.grossAmount;
    totalDiscount += amounts.discountAmount;
    total += amounts.netAmount;

    return {
      ...line,
      ...amounts,
    };
  });

  return {
    quotationId: quotation.id,
    versionNumber: currentVersion.versionNumber,
    currency: quotation.customer.currency,
    subtotal,
    totalDiscount,
    total,
    lines,
  };
}

async function getQuotationById(quotationId) {
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      customer: {
        include: {
          tier: true,
        },
      },
      rep: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      versions: {
        orderBy: {
          versionNumber: "desc",
        },
        include: {
          lines: {
            include: {
              product: {
                include: {
                  category: true,
                },
              },
            },
          },
          riskAssessment: true,
          approvalRequest: {
            include: {
              decisions: true,
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

  return quotation;
}

async function sendToCustomer(quotationId) {
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
  });

  if (!quotation) {
    const error = new Error("Quotation not found");
    error.statusCode = 404;
    throw error;
  }

  if (quotation.status !== "APPROVED") {
    const error = new Error(
      `Quotation must be APPROVED before sending to customer (current status: ${quotation.status})`
    );
    error.statusCode = 400;
    throw error;
  }

  return prisma.quotation.update({
    where: { id: quotationId },
    data: {
      status: "SENT_TO_CUSTOMER",
      lastActivityAt: new Date(),
    },
  });
}

module.exports = {
  createQuotation,
  getQuotationTotals,
  getQuotationById,
  sendToCustomer,
};