const prisma = require("../../config/db");

/**
 * Create a one-time invoice for an approved/fulfilled quotation.
 *
 * The invoice is generated from the latest quotation version.
 * Each quotation line becomes an invoice line.
 */
async function createOneTimeInvoice(quotationId) {
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
      invoices: true,
    },
  });

  if (!quotation) {
    const error = new Error("Quotation not found");
    error.statusCode = 404;
    throw error;
  }

  /*
   * A quotation must have reached fulfillment before
   * we generate its billing invoice.
   */
  if (
    quotation.status !== "FULFILLMENT" &&
    quotation.status !== "FULFILLED"
  ) {
    const error = new Error(
      "Quotation must be in fulfillment before invoicing"
    );
    error.statusCode = 400;
    throw error;
  }

  /*
   * Prevent duplicate one-time invoices.
   */
  const existingInvoice = quotation.invoices.find(
    (invoice) => invoice.type === "ONE_TIME"
  );

  if (existingInvoice) {
    const error = new Error(
      "One-time invoice already exists for this quotation"
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

  if (version.lines.length === 0) {
    const error = new Error(
      "Quotation has no invoiceable lines"
    );
    error.statusCode = 400;
    throw error;
  }

  /*
   * Calculate the invoice from the quotation lines.
   */
  const invoiceLines = version.lines.map((line) => {
    const grossAmount =
      line.unitPrice * line.quantity;

    const discountAmount =
      grossAmount * (line.discountPct / 100);

    const netAmount =
      grossAmount - discountAmount;

    return {
      quotationLineId: line.id,
      description: `${line.product.name} x ${line.quantity}`,
      amount: netAmount,
    };
  });

  const total = invoiceLines.reduce(
    (sum, line) => sum + line.amount,
    0
  );

  /*
   * Create invoice and invoice lines atomically.
   */
  const invoice = await prisma.$transaction(
    async (tx) => {
      const createdInvoice =
        await tx.invoice.create({
          data: {
            quotationId,
            type: "ONE_TIME",
            total,
            status: "UNPAID",
            lines: {
              create: invoiceLines,
            },
          },
          include: {
            lines: true,
            quotation: true,
          },
        });

      await tx.quotation.update({
        where: {
          id: quotationId,
        },
        data: {
          status: "INVOICED",
          lastActivityAt: new Date(),
        },
      });

      return createdInvoice;
    }
  );

  return invoice;
}

/**
 * Get one invoice by ID.
 */
async function getInvoiceById(invoiceId) {
  const invoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
    },
    include: {
      quotation: {
        include: {
          customer: true,
        },
      },
      lines: {
        include: {
          quotationLine: {
            include: {
              product: true,
            },
          },
        },
      },
      payments: true,
    },
  });

  if (!invoice) {
    const error = new Error("Invoice not found");
    error.statusCode = 404;
    throw error;
  }

  return invoice;
}

/**
 * List invoices.
 */
async function listInvoices() {
  return prisma.invoice.findMany({
    include: {
      quotation: {
        include: {
          customer: true,
        },
      },
      lines: true,
      payments: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

async function recordPayment(invoiceId, { amount, method }) {
  if (!amount || amount <= 0) {
    const error = new Error("Payment amount must be greater than 0");
    error.statusCode = 400;
    throw error;
  }

  if (!method || !method.trim()) {
    const error = new Error("Payment method is required");
    error.statusCode = 400;
    throw error;
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      payments: true,
      quotation: true,
    },
  });

  if (!invoice) {
    const error = new Error("Invoice not found");
    error.statusCode = 404;
    throw error;
  }

  if (invoice.status === "VOID") {
    const error = new Error("Cannot pay a void invoice");
    error.statusCode = 400;
    throw error;
  }

  if (invoice.status === "PAID") {
    const error = new Error("Invoice is already fully paid");
    error.statusCode = 400;
    throw error;
  }

  const alreadyPaid = invoice.payments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );

  const remainingAmount = invoice.total - alreadyPaid;

  if (amount > remainingAmount) {
    const error = new Error(
      `Payment exceeds remaining amount of ${remainingAmount}`
    );
    error.statusCode = 400;
    throw error;
  }

  const payment = await prisma.$transaction(async (tx) => {
    const createdPayment = await tx.payment.create({
      data: {
        invoiceId,
        amount,
        method: method.trim(),
      },
    });

    const newPaidAmount = alreadyPaid + amount;

    const fullyPaid = newPaidAmount >= invoice.total;

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: fullyPaid ? "PAID" : "PARTIALLY_PAID",
      },
    });

    if (fullyPaid) {
      await tx.quotation.update({
        where: { id: invoice.quotationId },
        data: {
          status: "PAID",
          lastActivityAt: new Date(),
        },
      });
    } else {
      await tx.quotation.update({
        where: { id: invoice.quotationId },
        data: {
          status: "PARTIALLY_PAID",
          lastActivityAt: new Date(),
        },
      });
    }

    return createdPayment;
  });

  const updatedInvoice = await getInvoiceById(invoiceId);

  return {
    payment,
    invoice: updatedInvoice,
  };
}

module.exports = {
  createOneTimeInvoice,
  getInvoiceById,
  listInvoices,
  recordPayment,
};