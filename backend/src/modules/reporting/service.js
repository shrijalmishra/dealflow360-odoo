const prisma = require("../../config/db");
const { getDealHealthSummary } = require("../dealHealth/service");

/**
 * Construct Prisma WHERE filter from query params
 */
function buildQuotationFilter(filters = {}) {
  const { customerId, repId, status, startDate, endDate } = filters;
  const where = {};

  if (customerId) where.customerId = customerId;
  if (repId) where.repId = repId;
  if (status) where.status = status;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  return where;
}

/**
 * Calculate financials for a list of quotation lines
 */
function calculateLinesFinancials(lines = []) {
  let gross = 0;
  let net = 0;
  let discount = 0;
  let oneTimeNet = 0;
  let recurringNet = 0;
  let totalCost = 0;
  let recommendationNet = 0;
  let recommendationLinesCount = 0;

  for (const line of lines) {
    const lineGross = line.unitPrice * line.quantity;
    const lineDiscount = lineGross * ((line.discountPct || 0) / 100);
    const lineNet = lineGross - lineDiscount;
    const lineCost = (line.product?.costPrice || 0) * line.quantity;

    gross += lineGross;
    net += lineNet;
    discount += lineDiscount;
    totalCost += lineCost;

    if (line.lineType === "RECURRING") {
      recurringNet += lineNet;
    } else {
      oneTimeNet += lineNet;
    }

    if (line.fromRecommendation) {
      recommendationLinesCount++;
      recommendationNet += lineNet;
    }
  }

  const avgDiscountPct = gross > 0 ? Math.round((discount / gross) * 1000) / 10 : 0;
  const profit = net - totalCost;
  const marginPct = net > 0 ? Math.round((profit / net) * 1000) / 10 : 0;

  return {
    gross,
    net,
    discount,
    oneTimeNet,
    recurringNet,
    totalCost,
    profit,
    marginPct,
    avgDiscountPct,
    recommendationLinesCount,
    recommendationNet,
  };
}

/**
 * Executive Management Dashboard Metrics
 */
async function getExecutiveDashboard(filters = {}) {
  const where = buildQuotationFilter(filters);

  // Fetch quotations matching filters with all related entities
  const quotations = await prisma.quotation.findMany({
    where,
    include: {
      customer: { include: { tier: true } },
      rep: { select: { id: true, name: true, email: true, role: true } },
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: {
          lines: { include: { product: true } },
          riskAssessment: true,
          approvalRequest: { include: { decisions: true } },
        },
      },
      fulfillments: {
        include: { backorders: true },
      },
      invoices: {
        include: { payments: true },
      },
    },
  });

  // 1. Pipeline & Revenue Metrics
  let pipelineGrossValue = 0;
  let pipelineNetValue = 0;
  let totalRealizedRevenue = 0; // from paid invoices
  let totalOneTimeRevenue = 0;
  let totalRecurringMRR = 0; // monthly recurring
  let dealsWonCount = 0;
  let dealsLostCount = 0;
  let totalRecommendationsAccepted = 0;
  let totalRecommendationRevenue = 0;
  let quotesWithRecommendations = 0;

  // Status Distribution
  const statusDistribution = {};
  // Risk Distribution
  const riskDistribution = { LOW: 0, MEDIUM: 0, HIGH: 0, UNASSESSED: 0 };
  let totalExcessDiscountLeakage = 0;
  let totalDiscountValueAllQuotes = 0;
  let totalGrossValueAllQuotes = 0;

  // Approvals Breakdown
  const approvalsSummary = {
    totalRequests: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    returned: 0,
    byStep: { SALES_MANAGER: 0, FINANCE_OPS: 0 },
  };

  // Fulfillment Breakdown
  const fulfillmentSummary = {
    totalFulfillments: 0,
    statusCounts: { PENDING: 0, PARTIALLY_FULFILLED: 0, FULFILLED: 0, BACKORDERED: 0 },
    totalBackorderedUnits: 0,
  };

  // Billing Breakdown
  const billingSummary = {
    totalInvoiced: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    invoiceCounts: { PAID: 0, PARTIALLY_PAID: 0, UNPAID: 0, VOID: 0 },
  };

  for (const q of quotations) {
    // Status distribution
    statusDistribution[q.status] = (statusDistribution[q.status] || 0) + 1;

    // Won / Lost logic
    const wonStatuses = [
      "CUSTOMER_CONFIRMED",
      "ORDER_CREATED",
      "FULFILLMENT",
      "PARTIALLY_FULFILLED",
      "FULFILLED",
      "INVOICED",
      "PARTIALLY_PAID",
      "PAID",
    ];
    const lostStatuses = ["CANCELLED", "REJECTED", "EXPIRED"];

    if (wonStatuses.includes(q.status)) dealsWonCount++;
    if (lostStatuses.includes(q.status)) dealsLostCount++;

    const latestVersion = q.versions[0];
    if (latestVersion) {
      const fin = calculateLinesFinancials(latestVersion.lines);

      totalGrossValueAllQuotes += fin.gross;
      totalDiscountValueAllQuotes += fin.discount;

      if (!lostStatuses.includes(q.status)) {
        pipelineGrossValue += fin.gross;
        pipelineNetValue += fin.net;
        totalOneTimeRevenue += fin.oneTimeNet;
        totalRecurringMRR += fin.recurringNet;
      }

      // Upsell / Recommendation metrics
      if (fin.recommendationLinesCount > 0) {
        quotesWithRecommendations++;
        totalRecommendationsAccepted += fin.recommendationLinesCount;
        totalRecommendationRevenue += fin.recommendationNet;
      }

      // Risk distribution
      if (latestVersion.riskAssessment) {
        const rLevel = latestVersion.riskAssessment.riskLevel;
        riskDistribution[rLevel] = (riskDistribution[rLevel] || 0) + 1;
        totalExcessDiscountLeakage += latestVersion.riskAssessment.totalExcessValue || 0;
      } else {
        riskDistribution.UNASSESSED++;
      }

      // Approval request metrics
      if (latestVersion.approvalRequest) {
        approvalsSummary.totalRequests++;
        const reqStatus = latestVersion.approvalRequest.status;
        if (reqStatus === "PENDING") approvalsSummary.pending++;
        else if (reqStatus === "APPROVED") approvalsSummary.approved++;
        else if (reqStatus === "REJECTED") approvalsSummary.rejected++;
        else if (reqStatus === "RETURNED_FOR_REVISION") approvalsSummary.returned++;

        const step = latestVersion.approvalRequest.currentStep;
        if (step && approvalsSummary.byStep[step] !== undefined) {
          approvalsSummary.byStep[step]++;
        }
      }
    }

    // Fulfillments
    if (q.fulfillments && q.fulfillments.length > 0) {
      for (const f of q.fulfillments) {
        fulfillmentSummary.totalFulfillments++;
        fulfillmentSummary.statusCounts[f.status] =
          (fulfillmentSummary.statusCounts[f.status] || 0) + 1;

        if (f.backorders && f.backorders.length > 0) {
          const pending = f.backorders.reduce((sum, b) => sum + (b.qtyPending || 0), 0);
          fulfillmentSummary.totalBackorderedUnits += pending;
        }
      }
    }

    // Invoices & Payments
    if (q.invoices && q.invoices.length > 0) {
      for (const inv of q.invoices) {
        billingSummary.totalInvoiced += inv.total;
        billingSummary.invoiceCounts[inv.status] =
          (billingSummary.invoiceCounts[inv.status] || 0) + 1;

        let invPaid = 0;
        if (inv.payments) {
          invPaid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
        }

        if (inv.status === "PAID") {
          totalRealizedRevenue += inv.total;
          billingSummary.totalCollected += inv.total;
        } else {
          billingSummary.totalCollected += invPaid;
          billingSummary.totalOutstanding += inv.total - invPaid;
        }
      }
    }
  }

  // Win Rate calculation
  const closedDeals = dealsWonCount + dealsLostCount;
  const winRatePct =
    closedDeals > 0 ? Math.round((dealsWonCount / closedDeals) * 1000) / 10 : 0;

  // Average discount %
  const overallAvgDiscountPct =
    totalGrossValueAllQuotes > 0
      ? Math.round((totalDiscountValueAllQuotes / totalGrossValueAllQuotes) * 1000) / 10
      : 0;

  // Deal Health Summary
  const dealHealthSummary = await getDealHealthSummary();

  return {
    filtersApplied: filters,
    executiveSummary: {
      totalQuotations: quotations.length,
      pipelineGrossValue,
      pipelineNetValue,
      realizedRevenue: totalRealizedRevenue,
      oneTimeRevenue: totalOneTimeRevenue,
      recurringMRR: totalRecurringMRR,
      recurringARR: totalRecurringMRR * 12,
      winRatePct,
      dealsWonCount,
      dealsLostCount,
    },
    pipelineDistribution: {
      byStatus: statusDistribution,
    },
    discountAndRiskAnalytics: {
      overallAvgDiscountPct,
      totalExcessDiscountLeakage,
      totalDiscountValue: totalDiscountValueAllQuotes,
      riskDistribution,
    },
    approvalPipeline: approvalsSummary,
    fulfillmentAndDelivery: fulfillmentSummary,
    billingAndCollections: billingSummary,
    upsellCrossSellImpact: {
      recommendationsAcceptedCount: totalRecommendationsAccepted,
      recommendationRevenue: totalRecommendationRevenue,
      quotesWithRecommendations,
      attachRatePct:
        quotations.length > 0
          ? Math.round((quotesWithRecommendations / quotations.length) * 1000) / 10
          : 0,
    },
    dealHealthOverview: dealHealthSummary,
  };
}

/**
 * Tabular Quotation Report (for grid viewing or CSV export)
 */
async function getQuotationReport(filters = {}) {
  const where = buildQuotationFilter(filters);

  const quotations = await prisma.quotation.findMany({
    where,
    include: {
      customer: { include: { tier: true } },
      rep: { select: { id: true, name: true, email: true, role: true } },
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: {
          lines: { include: { product: true } },
          riskAssessment: true,
          approvalRequest: true,
        },
      },
      fulfillments: true,
      invoices: {
        include: { payments: true },
      },
      dealAlerts: {
        where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return quotations.map((q) => {
    const v = q.versions[0];
    const fin = v ? calculateLinesFinancials(v.lines) : {};

    let paidAmount = 0;
    let invStatus = "NO_INVOICE";
    if (q.invoices && q.invoices.length > 0) {
      invStatus = q.invoices[0].status;
      paidAmount = q.invoices.reduce((sum, inv) => {
        const payments = inv.payments || [];
        return sum + payments.reduce((pSum, p) => pSum + p.amount, 0);
      }, 0);
    }

    let fStatus = "UNFULFILLED";
    if (q.fulfillments && q.fulfillments.length > 0) {
      fStatus = q.fulfillments[0].status;
    }

    return {
      id: q.id,
      customerName: q.customer.name,
      customerTier: q.customer.tier?.name || "STANDARD",
      currency: q.customer.currency,
      repName: q.rep.name,
      repEmail: q.rep.email,
      status: q.status,
      versionNumber: q.currentVersionNo,
      createdAt: q.createdAt.toISOString(),
      lastActivityAt: q.lastActivityAt ? q.lastActivityAt.toISOString() : q.createdAt.toISOString(),
      grossTotal: fin.gross || 0,
      netTotal: fin.net || 0,
      discountAmount: fin.discount || 0,
      avgDiscountPct: fin.avgDiscountPct || 0,
      marginPct: fin.marginPct || 0,
      oneTimeNet: fin.oneTimeNet || 0,
      recurringNet: fin.recurringNet || 0,
      riskLevel: v?.riskAssessment?.riskLevel || "LOW",
      blendedScore: v?.riskAssessment?.blendedScore || 0,
      approvalStatus: v?.approvalRequest?.status || "NONE",
      fulfillmentStatus: fStatus,
      invoiceStatus: invStatus,
      paidAmount,
      hasRecommendations: fin.recommendationLinesCount > 0,
      recommendationRevenue: fin.recommendationNet || 0,
      openAlertsCount: q.dealAlerts ? q.dealAlerts.length : 0,
    };
  });
}

/**
 * Escape and format CSV fields
 */
function escapeCSV(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Export Quotations Report as CSV formatted string
 */
async function exportQuotationsCSV(filters = {}) {
  const rows = await getQuotationReport(filters);

  const headers = [
    "Quotation ID",
    "Customer Name",
    "Customer Tier",
    "Currency",
    "Sales Rep",
    "Status",
    "Version",
    "Created Date",
    "Last Activity",
    "Gross Total",
    "Net Total",
    "Discount Amount",
    "Avg Discount %",
    "Margin %",
    "One-Time Net",
    "Recurring Net",
    "Risk Level",
    "Blended Risk Score",
    "Approval Status",
    "Fulfillment Status",
    "Invoice Status",
    "Paid Amount",
    "Has Recommendations",
    "Recommendation Revenue",
    "Open Alerts Count",
  ];

  const csvLines = [headers.join(",")];

  for (const r of rows) {
    const values = [
      escapeCSV(r.id),
      escapeCSV(r.customerName),
      escapeCSV(r.customerTier),
      escapeCSV(r.currency),
      escapeCSV(r.repName),
      escapeCSV(r.status),
      escapeCSV(r.versionNumber),
      escapeCSV(r.createdAt),
      escapeCSV(r.lastActivityAt),
      escapeCSV(r.grossTotal),
      escapeCSV(r.netTotal),
      escapeCSV(r.discountAmount),
      escapeCSV(r.avgDiscountPct),
      escapeCSV(r.marginPct),
      escapeCSV(r.oneTimeNet),
      escapeCSV(r.recurringNet),
      escapeCSV(r.riskLevel),
      escapeCSV(r.blendedScore),
      escapeCSV(r.approvalStatus),
      escapeCSV(r.fulfillmentStatus),
      escapeCSV(r.invoiceStatus),
      escapeCSV(r.paidAmount),
      escapeCSV(r.hasRecommendations),
      escapeCSV(r.recommendationRevenue),
      escapeCSV(r.openAlertsCount),
    ];
    csvLines.push(values.join(","));
  }

  return csvLines.join("\n");
}

/**
 * Export Quotations Report as Microsoft Excel XML Spreadsheet (XLS)
 * Generates a valid XML spreadsheet that natively opens in MS Excel, LibreOffice, etc.
 */
async function exportQuotationsXLS(filters = {}) {
  const rows = await getQuotationReport(filters);

  const escapeXML = (val) => {
    if (val === null || val === undefined) return "";
    return String(val)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  const headers = [
    "Quotation ID",
    "Customer Name",
    "Customer Tier",
    "Currency",
    "Sales Rep",
    "Status",
    "Version",
    "Created Date",
    "Gross Total",
    "Net Total",
    "Discount Amount",
    "Avg Discount %",
    "Margin %",
    "One-Time Net",
    "Recurring Net",
    "Risk Level",
    "Blended Risk Score",
    "Approval Status",
    "Fulfillment Status",
    "Invoice Status",
    "Paid Amount"
  ];

  let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#111111" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#333333"/>
   </Borders>
  </Style>
  <Style ss:ID="Number">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="#,##0.00"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Quotations Report">
  <Table ss:DefaultRowHeight="20">
`;

  headers.forEach(() => {
    xml += `   <Column ss:AutoFitWidth="1" ss:Width="120"/>\n`;
  });

  xml += `   <Row ss:Height="24" ss:StyleID="Header">\n`;
  for (const h of headers) {
    xml += `    <Cell><Data ss:Type="String">${escapeXML(h)}</Data></Cell>\n`;
  }
  xml += `   </Row>\n`;

  for (const r of rows) {
    xml += `   <Row>\n`;
    xml += `    <Cell><Data ss:Type="String">${escapeXML(r.id.substring(0, 8).toUpperCase())}</Data></Cell>\n`;
    xml += `    <Cell><Data ss:Type="String">${escapeXML(r.customerName)}</Data></Cell>\n`;
    xml += `    <Cell><Data ss:Type="String">${escapeXML(r.customerTier)}</Data></Cell>\n`;
    xml += `    <Cell><Data ss:Type="String">${escapeXML(r.currency)}</Data></Cell>\n`;
    xml += `    <Cell><Data ss:Type="String">${escapeXML(r.repName)}</Data></Cell>\n`;
    xml += `    <Cell><Data ss:Type="String">${escapeXML(r.status)}</Data></Cell>\n`;
    xml += `    <Cell><Data ss:Type="Number">${r.versionNumber}</Data></Cell>\n`;
    xml += `    <Cell><Data ss:Type="String">${escapeXML(new Date(r.createdAt).toISOString().split('T')[0])}</Data></Cell>\n`;
    xml += `    <Cell ss:StyleID="Number"><Data ss:Type="Number">${r.grossTotal}</Data></Cell>\n`;
    xml += `    <Cell ss:StyleID="Number"><Data ss:Type="Number">${r.netTotal}</Data></Cell>\n`;
    xml += `    <Cell ss:StyleID="Number"><Data ss:Type="Number">${r.discountAmount}</Data></Cell>\n`;
    xml += `    <Cell ss:StyleID="Number"><Data ss:Type="Number">${r.avgDiscountPct}</Data></Cell>\n`;
    xml += `    <Cell ss:StyleID="Number"><Data ss:Type="Number">${r.marginPct}</Data></Cell>\n`;
    xml += `    <Cell ss:StyleID="Number"><Data ss:Type="Number">${r.oneTimeNet}</Data></Cell>\n`;
    xml += `    <Cell ss:StyleID="Number"><Data ss:Type="Number">${r.recurringNet}</Data></Cell>\n`;
    xml += `    <Cell><Data ss:Type="String">${escapeXML(r.riskLevel)}</Data></Cell>\n`;
    xml += `    <Cell ss:StyleID="Number"><Data ss:Type="Number">${r.blendedScore}</Data></Cell>\n`;
    xml += `    <Cell><Data ss:Type="String">${escapeXML(r.approvalStatus)}</Data></Cell>\n`;
    xml += `    <Cell><Data ss:Type="String">${escapeXML(r.fulfillmentStatus)}</Data></Cell>\n`;
    xml += `    <Cell><Data ss:Type="String">${escapeXML(r.invoiceStatus)}</Data></Cell>\n`;
    xml += `    <Cell ss:StyleID="Number"><Data ss:Type="Number">${r.paidAmount}</Data></Cell>\n`;
    xml += `   </Row>\n`;
  }

  xml += `  </Table>
 </Worksheet>
</Workbook>`;

  return xml;
}

/**
 * Export Quotations Report as PDF document buffer (standard PDF 1.4)
 */
async function exportQuotationsPDF(filters = {}) {
  const rows = await getQuotationReport(filters);

  // Generate clean PDF 1.4 binary content
  const lines = [
    "%PDF-1.4",
    "%âãÏÓ",
    "1 0 obj",
    "<< /Type /Catalog /Pages 2 0 R >>",
    "endobj",
    "2 0 obj",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "endobj",
    "3 0 obj",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "endobj",
    "4 0 obj",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    "endobj",
    "5 0 obj",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "endobj",
  ];

  // Content stream
  let stream = "";
  stream += "BT\n";
  stream += "/F1 16 Tf\n";
  stream += "50 740 Td\n";
  stream += "(DealFlow360 - Executive Quotations Report) Tj\n";
  stream += "ET\n";

  stream += "BT\n";
  stream += "/F2 9 Tf\n";
  stream += "50 722 Td\n";
  stream += `(Generated on: ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC | Filtered Records: ${rows.length}) Tj\n`;
  stream += "ET\n";

  // Table header line
  stream += "0.2 w\n";
  stream += "50 710 m 562 710 l S\n";

  // Columns: ID, Customer, Rep, Status, Net Total, Risk, Approval
  stream += "BT\n";
  stream += "/F1 8 Tf\n";
  stream += "50 698 Td (ID) Tj\n";
  stream += "45 0 Td (CUSTOMER) Tj\n";
  stream += "110 0 Td (SALES REP) Tj\n";
  stream += "90 0 Td (STATUS) Tj\n";
  stream += "80 0 Td (NET TOTAL) Tj\n";
  stream += "70 0 Td (RISK) Tj\n";
  stream += "60 0 Td (APPROVAL) Tj\n";
  stream += "ET\n";

  stream += "50 690 m 562 690 l S\n";

  let y = 675;
  for (const r of rows.slice(0, 32)) {
    const cleanStr = (s) => (s || "").replace(/[()\\\r\n]/g, "");
    const qId = cleanStr(r.id.substring(0, 8).toUpperCase());
    const cust = cleanStr(r.customerName).substring(0, 18);
    const rep = cleanStr(r.repName).substring(0, 14);
    const status = cleanStr(r.status).substring(0, 14);
    const net = Number(r.netTotal || 0).toLocaleString("en-IN", { style: "currency", currency: r.currency || "INR", maximumFractionDigits: 0 }).replace(/[()\\\r\n]/g, "");
    const risk = cleanStr(r.riskLevel);
    const appr = cleanStr(r.approvalStatus);

    stream += "BT\n";
    stream += "/F2 7.5 Tf\n";
    stream += `50 ${y} Td (${qId}) Tj\n`;
    stream += `45 0 Td (${cust}) Tj\n`;
    stream += `110 0 Td (${rep}) Tj\n`;
    stream += `90 0 Td (${status}) Tj\n`;
    stream += `80 0 Td (${net}) Tj\n`;
    stream += `70 0 Td (${risk}) Tj\n`;
    stream += `60 0 Td (${appr}) Tj\n`;
    stream += "ET\n";

    y -= 18;
    if (y < 60) break;
  }

  // Footer rule
  stream += "50 45 m 562 45 l S\n";
  stream += "BT\n";
  stream += "/F2 7 Tf\n";
  stream += "50 35 Td (DealFlow360 Enterprise Governance - Confidential Sales Report) Tj\n";
  stream += "ET\n";

  const streamLength = Buffer.byteLength(stream, "utf-8");
  lines.push(
    "6 0 obj",
    `<< /Length ${streamLength} >>`,
    "stream",
    stream,
    "endstream",
    "endobj"
  );

  // Xref table calculation
  let offset = 0;
  const xref = ["xref", "0 7", "0000000000 65535 f "];
  const objOffsets = [];

  // Build the complete file buffer
  let pdfText = "";
  for (const line of lines) {
    if (line.match(/^\d+ 0 obj/)) {
      objOffsets.push(pdfText.length);
    }
    pdfText += line + "\n";
  }

  for (const off of objOffsets) {
    xref.push(String(off).padStart(10, "0") + " 00000 n ");
  }

  const startxref = pdfText.length;
  pdfText += xref.join("\n") + "\n";
  pdfText += "trailer\n";
  pdfText += "<< /Size 7 /Root 1 0 R >>\n";
  pdfText += "startxref\n";
  pdfText += `${startxref}\n`;
  pdfText += "%%EOF\n";

  return Buffer.from(pdfText, "utf-8");
}

module.exports = {
  buildQuotationFilter,
  getExecutiveDashboard,
  getQuotationReport,
  exportQuotationsCSV,
  exportQuotationsXLS,
  exportQuotationsPDF,
};
