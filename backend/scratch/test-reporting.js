const prisma = require('../src/config/db');

async function runReportingTests() {
  const BASE_URL = 'http://localhost:4000';
  console.log('====================================================');
  console.log('   PART 12: REPORTING & ANALYTICS TEST');
  console.log('====================================================\n');

  // --- Step 1: Authentication ---
  console.log('--- 1. Authenticating Roles ---');
  const adminRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@dealflow360.test', password: 'Admin@12345' }),
  });
  const adminAuth = await adminRes.json();
  const adminToken = adminAuth.token;

  const mgrRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'manager@dealflow360.test', password: 'Manager@12345' }),
  });
  const mgrAuth = await mgrRes.json();
  const mgrToken = mgrAuth.token;

  const repRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rep@dealflow360.test', password: 'Rep@12345' }),
  });
  const repAuth = await repRes.json();
  const repToken = repAuth.token;

  console.log('Admin:', adminAuth.user?.email, '| Manager:', mgrAuth.user?.email, '| Rep:', repAuth.user?.email);

  // --- Step 2: Test 1 - Executive Dashboard KPIs ---
  console.log('\n--- 2. TEST 1: Executive Dashboard Live Metrics ---');
  const dashRes = await fetch(`${BASE_URL}/api/reporting/dashboard`, {
    headers: { 'Authorization': `Bearer ${mgrToken}` },
  });
  const dash = await dashRes.json();

  console.log('Executive Summary:');
  console.log(`  Total Quotations:    ${dash.executiveSummary?.totalQuotations}`);
  console.log(`  Pipeline Net Value:  ₹${dash.executiveSummary?.pipelineNetValue}`);
  console.log(`  Realized Revenue:    ₹${dash.executiveSummary?.realizedRevenue}`);
  console.log(`  One-Time Revenue:    ₹${dash.executiveSummary?.oneTimeRevenue}`);
  console.log(`  Recurring MRR:       ₹${dash.executiveSummary?.recurringMRR}/mo`);
  console.log(`  Recurring ARR:       ₹${dash.executiveSummary?.recurringARR}/yr`);
  console.log(`  Win Rate:            ${dash.executiveSummary?.winRatePct}% (${dash.executiveSummary?.dealsWonCount} won / ${dash.executiveSummary?.dealsLostCount} lost)`);

  console.log('\nDiscount & Governance Analytics:');
  console.log(`  Average Discount:    ${dash.discountAndRiskAnalytics?.overallAvgDiscountPct}%`);
  console.log(`  Excess Leakage:      ₹${dash.discountAndRiskAnalytics?.totalExcessDiscountLeakage}`);
  console.log('  Risk Breakdown:     ', dash.discountAndRiskAnalytics?.riskDistribution);

  console.log('\nUpsell / Cross-Sell Performance:');
  console.log(`  Recommendations Accepted: ${dash.upsellCrossSellImpact?.recommendationsAcceptedCount}`);
  console.log(`  Recommendation Revenue:   ₹${dash.upsellCrossSellImpact?.recommendationRevenue}`);
  console.log(`  Attach Rate:              ${dash.upsellCrossSellImpact?.attachRatePct}%`);

  console.log('\nOperations & Billing:');
  console.log('  Approval Pipeline:  ', dash.approvalPipeline);
  console.log('  Fulfillment Status: ', dash.fulfillmentAndDelivery?.statusCounts);
  console.log('  Billing Totals:     ', {
    invoiced: dash.billingAndCollections?.totalInvoiced,
    collected: dash.billingAndCollections?.totalCollected,
    outstanding: dash.billingAndCollections?.totalOutstanding,
  });

  if (!dash.executiveSummary || dash.executiveSummary.totalQuotations < 5) {
    throw new Error('Executive dashboard failed to aggregate live data!');
  }
  console.log('>>> TEST 1 PASSED: Executive dashboard aggregates live database records.');

  // --- Step 3: Test 2 - Customer & Status Filtering ---
  console.log('\n--- 3. TEST 2: Filtered Dashboard Queries ---');
  const acme = await prisma.customer.findFirst({ where: { name: { contains: 'Acme' } } });

  const filteredRes = await fetch(`${BASE_URL}/api/reporting/dashboard?customerId=${acme.id}&status=CUSTOMER_CONFIRMED`, {
    headers: { 'Authorization': `Bearer ${mgrToken}` },
  });
  const filteredData = await filteredRes.json();
  console.log(`Filtered (Customer: Acme, Status: CUSTOMER_CONFIRMED): ${filteredData.executiveSummary?.totalQuotations} quotes`);
  if (filteredData.executiveSummary?.totalQuotations < 1) {
    throw new Error('Filtering by customer and status failed!');
  }
  console.log('>>> TEST 2 PASSED: Query filters correctly applied.');

  // --- Step 4: Test 3 - Tabular Quotation Report ---
  console.log('\n--- 4. TEST 3: Tabular Quotation Report ---');
  const reportRes = await fetch(`${BASE_URL}/api/reporting/quotations?limit=10`, {
    headers: { 'Authorization': `Bearer ${repToken}` },
  });
  const reportData = await reportRes.json();
  console.log(`Tabular report returned ${reportData.count} quotes.`);
  const sample = reportData.quotations[0];
  console.log('Sample Quotation Report Row:');
  console.log(`  Quote ID:            ${sample.id}`);
  console.log(`  Customer:            ${sample.customerName} (${sample.customerTier})`);
  console.log(`  Sales Rep:           ${sample.repName}`);
  console.log(`  Status:              ${sample.status} (v${sample.versionNumber})`);
  console.log(`  Gross / Net Total:   ₹${sample.grossTotal} / ₹${sample.netTotal}`);
  console.log(`  Discount / Margin:   ₹${sample.discountAmount} (${sample.avgDiscountPct}%) | Margin: ${sample.marginPct}%`);
  console.log(`  Risk / Approval:     ${sample.riskLevel} (score: ${sample.blendedScore}) | Approval: ${sample.approvalStatus}`);
  console.log(`  Fulfillment / Invoice: ${sample.fulfillmentStatus} | ${sample.invoiceStatus} (Paid: ₹${sample.paidAmount})`);
  console.log(`  Has Recommendations: ${sample.hasRecommendations} (Revenue: ₹${sample.recommendationRevenue})`);

  if (!sample.customerName || sample.netTotal === undefined) {
    throw new Error('Tabular quotation report missing essential columns!');
  }
  console.log('>>> TEST 3 PASSED: Rich denormalized tabular quotation report returned.');

  // --- Step 5: Test 4 - CSV Export Format & Headers ---
  console.log('\n--- 5. TEST 4: CSV Export File Generation ---');
  const csvRes = await fetch(`${BASE_URL}/api/reporting/export/quotations.csv`, {
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  console.log(`CSV Export Status: ${csvRes.status}`);
  console.log(`Content-Type: ${csvRes.headers.get('content-type')}`);
  console.log(`Content-Disposition: ${csvRes.headers.get('content-disposition')}`);

  const csvText = await csvRes.text();
  const csvLines = csvText.split('\n');
  console.log(`CSV generated ${csvLines.length} lines.`);
  console.log('CSV Header:', csvLines[0]);
  console.log('CSV First Row:', csvLines[1]?.slice(0, 100) + '...');

  if (csvRes.status !== 200 || !csvText.startsWith('Quotation ID,Customer Name') || csvLines.length < 5) {
    throw new Error('CSV export generation failed or invalid format!');
  }
  console.log('>>> TEST 4 PASSED: Valid CSV file successfully generated with proper headers.');

  // --- Step 6: Test 5 - RBAC Enforcement on CSV Export ---
  console.log('\n--- 6. TEST 5: RBAC on CSV Export ---');
  // Sales Rep should be forbidden from downloading raw data export
  const repCsvRes = await fetch(`${BASE_URL}/api/reporting/export/quotations.csv`, {
    headers: { 'Authorization': `Bearer ${repToken}` },
  });
  console.log(`Sales Rep downloading CSV (expected 403): ${repCsvRes.status}`);
  if (repCsvRes.status !== 403) {
    throw new Error('Sales Rep should be restricted from exporting CSV!');
  }

  // Manager is permitted
  const mgrCsvRes = await fetch(`${BASE_URL}/api/reporting/export/quotations.csv`, {
    headers: { 'Authorization': `Bearer ${mgrToken}` },
  });
  console.log(`Sales Manager downloading CSV (expected 200): ${mgrCsvRes.status}`);
  if (mgrCsvRes.status !== 200) {
    throw new Error('Sales Manager should be permitted to export CSV!');
  }
  console.log('>>> TEST 5 PASSED: Strict RBAC verified on data export.');

  console.log('\n====================================================');
  console.log('   ALL 5 REPORTING & ANALYTICS TESTS PASSED! ✅');
  console.log('====================================================');
  process.exit(0);
}

runReportingTests().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
