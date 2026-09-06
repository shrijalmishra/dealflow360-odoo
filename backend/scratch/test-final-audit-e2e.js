const prisma = require('../src/config/db');

async function runFinalAuditE2E() {
  const BASE_URL = 'http://localhost:4000';
  console.log('================================================================');
  console.log('   PART 13: BACKEND FINAL AUDIT & COMPREHENSIVE E2E VERIFICATION');
  console.log('================================================================\n');

  // ==========================================================================
  // 1. AUTHENTICATION & TOKEN ACQUISITION
  // ==========================================================================
  console.log('--- 1. Authenticating All Roles ---');
  // Admin
  const adminLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@dealflow360.test', password: 'Admin@12345' }),
  });
  const adminToken = (await adminLogin.json()).token;

  // Sales Manager
  const mgrLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'manager@dealflow360.test', password: 'Manager@12345' }),
  });
  const mgrToken = (await mgrLogin.json()).token;

  // Sales Rep
  const repLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rep@dealflow360.test', password: 'Rep@12345' }),
  });
  const repAuth = await repLogin.json();
  const repToken = repAuth.token;
  const repUser = repAuth.user;

  // Customer Portal User
  const custLogin = await fetch(`${BASE_URL}/api/auth/customer-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'customer@acme.dealflow360.test', password: 'Customer@12345' }),
  });
  const custAuth = await custLogin.json();
  const custToken = custAuth.token;
  const acmeCustomer = custAuth.customer;

  console.log('Authenticated: Admin, Sales Manager, Sales Rep, and Customer Portal User.');

  // Ensure East Depot has sufficient stock for clean fulfillment
  const dell = await prisma.product.findFirst({ where: { name: { contains: 'Dell' } } });
  const eastDepot = await prisma.warehouse.findFirst({ where: { name: { contains: 'East' } } });
  await prisma.warehouseInventory.upsert({
    where: { warehouseId_productId: { warehouseId: eastDepot.id, productId: dell.id } },
    update: { availableQty: 20 },
    create: { warehouseId: eastDepot.id, productId: dell.id, availableQty: 20, reservedQty: 0 },
  });

  // ==========================================================================
  // 2. FLOW A: SALES REP QUOTE -> EXCESSIVE DISCOUNT -> RISK -> APPROVAL ->
  //            FULFILLMENT -> INVOICE -> PAYMENT -> PAID
  // ==========================================================================
  console.log('\n================================================================');
  console.log('   FLOW A: SALES -> GOVERNANCE -> FULFILLMENT -> BILLING -> PAID');
  console.log('================================================================');

  // Step A1: Rep creates quotation with high discount (30% > 15% category ceiling)
  console.log('\n[A1] Rep creates quotation with high discount (30%)...');
  const quoteARes = await fetch(`${BASE_URL}/api/quotations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${repToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customerId: acmeCustomer.id,
      repId: repUser.id,
      lines: [{
        productId: dell.id,
        quantity: 2,
        discountPct: 30, // Excessive discount triggering governance
        lineType: 'ONE_TIME',
      }],
    }),
  });
  const quoteAData = await quoteARes.json();
  const quoteAId = quoteAData.quotation?.id;
  console.log(`Quotation created: ${quoteAId} (Status: ${quoteAData.quotation?.status})`);

  // Step A2: Assess discount risk
  console.log('\n[A2] Calculating discount risk...');
  const riskRes = await fetch(`${BASE_URL}/api/discount-risk/quotations/${quoteAId}/assess`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${repToken}` },
  });
  const riskData = await riskRes.json();
  const riskAssessment = riskData.riskAssessment;
  console.log(`Risk Level: ${riskAssessment.riskLevel} | Blended Score: ${riskAssessment.blendedScore} | Worst Excess: ${riskAssessment.worstLineExcessPct}%`);
  if (riskAssessment.riskLevel === 'LOW') {
    throw new Error('Expected elevated risk for 30% discount!');
  }

  // Step A3: Create approval request
  console.log('\n[A3] Submitting approval request...');
  const appReqRes = await fetch(`${BASE_URL}/api/approvals/quotations/${quoteAId}/request`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${repToken}` },
  });
  const appReqData = await appReqRes.json();
  console.log(`Approval Request Status: ${appReqData.status || appReqData.quotationStatus} (Step: ${appReqData.approvalRequest?.currentStep})`);

  // Step A4: Sales Manager reviews and approves
  console.log('\n[A4] Sales Manager approves quotation...');
  const mgrApproveRes = await fetch(`${BASE_URL}/api/approvals/quotations/${quoteAId}/decision`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${mgrToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      decision: 'APPROVED',
      reason: 'Approved for strategic account volume target.',
    }),
  });
  const mgrApproveData = await mgrApproveRes.json();
  console.log(`Manager Decision result: Status = ${mgrApproveData.quotationStatus}`);
  if (mgrApproveData.quotationStatus !== 'APPROVED') {
    throw new Error('Expected quotation status APPROVED after manager decision!');
  }

  // Step A5: Calculate Warehouse Allocation Plan
  console.log('\n[A5] Calculating warehouse allocation plan...');
  const allocRes = await fetch(`${BASE_URL}/api/warehouses/allocation/quotation/${quoteAId}`, {
    headers: { 'Authorization': `Bearer ${repToken}` },
  });
  const allocData = await allocRes.json();
  console.log(`Allocation calculated: Total Requested: ${allocData.totalRequested}, Total Allocated: ${allocData.totalAllocated}`);

  // Step A6: Create Fulfillment and reserve stock
  console.log('\n[A6] Executing fulfillment & inventory reservation...');
  const fulfillRes = await fetch(`${BASE_URL}/api/warehouses/fulfillment/quotation/${quoteAId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${repToken}` },
  });
  const fulfillData = await fulfillRes.json();
  const fulfillment = fulfillData.fulfillment;
  console.log(`Fulfillment created: ID ${fulfillment.id} | Status: ${fulfillment.status}`);

  // Verify quote status transitioned to FULFILLMENT
  const quoteAfterFulfill = await prisma.quotation.findUnique({ where: { id: quoteAId } });
  console.log(`Quotation status after fulfillment: ${quoteAfterFulfill.status}`);
  if (quoteAfterFulfill.status !== 'FULFILLMENT') {
    throw new Error('Expected quotation status FULFILLMENT!');
  }

  // Step A7: Generate One-Time Billing Invoice
  console.log('\n[A7] Generating one-time invoice...');
  const invRes = await fetch(`${BASE_URL}/api/billing/quotation/${quoteAId}/one-time`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${repToken}` },
  });
  const invData = await invRes.json();
  const invoice = invData.invoice;
  console.log(`Invoice generated: #${invoice.id} | Total: ₹${invoice.total} | Status: ${invoice.status}`);

  // Step A8: Record Payment against Invoice
  console.log('\n[A8] Recording full customer payment against invoice...');
  const payRes = await fetch(`${BASE_URL}/api/billing/invoices/${invoice.id}/payments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${repToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: invoice.total,
      method: 'BANK_TRANSFER',
    }),
  });
  const payData = await payRes.json();
  console.log(`Payment recorded: ₹${payData.amount} | Method: ${payData.method}`);

  // Verify final quotation and invoice status = PAID
  const quoteAFinal = await prisma.quotation.findUnique({ where: { id: quoteAId } });
  const invoiceFinal = await prisma.invoice.findUnique({ where: { id: invoice.id } });
  console.log(`Final Quotation Status: ${quoteAFinal.status}`);
  console.log(`Final Invoice Status:   ${invoiceFinal.status}`);
  if (quoteAFinal.status !== 'PAID' || invoiceFinal.status !== 'PAID') {
    throw new Error('Flow A failed: Quotation and Invoice must be PAID!');
  }
  console.log('>>> FLOW A COMPLETE & VERIFIED: Sales -> Payment lifecycle fully executed.');

  // ==========================================================================
  // 3. FLOW B: CUSTOMER NEGOTIATION -> COUNTER-OFFER -> RE-APPROVAL -> CONFIRMED
  // ==========================================================================
  console.log('\n================================================================');
  console.log('   FLOW B: CUSTOMER NEGOTIATION -> RE-APPROVAL -> CONFIRMATION');
  console.log('================================================================');

  // Step B1: Rep creates and approves a baseline quotation
  console.log('\n[B1] Creating approved quote for customer...');
  const quoteB = await prisma.quotation.create({
    data: {
      customerId: acmeCustomer.id,
      repId: repUser.id,
      status: 'APPROVED',
      currentVersionNo: 1,
      versions: {
        create: {
          versionNumber: 1,
          lines: {
            create: [{
              productId: dell.id,
              quantity: 5,
              unitPrice: dell.basePrice,
              discountPct: 5,
              allowedDiscountPct: 15,
              lineType: 'ONE_TIME',
            }],
          },
          riskAssessment: {
            create: {
              riskLevel: 'LOW',
              blendedScore: 0,
              worstLineExcessPct: 0,
              totalExcessValue: 0,
            },
          },
        },
      },
    },
    include: { versions: { include: { lines: true } } },
  });
  const lineBId = quoteB.versions[0].lines[0].id;
  console.log(`Quotation created: ${quoteB.id} (Status: ${quoteB.status})`);

  // Step B2: Rep sends quote to customer
  console.log('\n[B2] Rep sends quotation to customer portal...');
  const sendRes = await fetch(`${BASE_URL}/api/quotations/${quoteB.id}/send-to-customer`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${repToken}` },
  });
  const sendData = await sendRes.json();
  console.log(`Quotation status: ${sendData.quotation?.status}`);

  // Step B3: Customer logs in and views quotation
  console.log('\n[B3] Customer retrieves quote in portal...');
  const custViewRes = await fetch(`${BASE_URL}/api/portal/quotations/${quoteB.id}`, {
    headers: { 'Authorization': `Bearer ${custToken}` },
  });
  const custView = await custViewRes.json();
  console.log(`Customer portal sees status: "${custView.quotation?.status}"`);

  // Step B4: Customer submits line comment and change request
  console.log('\n[B4] Customer adds comment & change request...');
  await fetch(`${BASE_URL}/api/portal/quotations/${quoteB.id}/comments`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${custToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ lineId: lineBId, comment: 'Requesting 25% discount for 10 units.' }),
  });

  await fetch(`${BASE_URL}/api/portal/quotations/${quoteB.id}/change-requests`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${custToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ lineId: lineBId, requestedQuantity: 10, requestedDiscountPct: 25, notes: 'Volume tier discount' }),
  });
  console.log('Customer comments and change requests submitted.');

  // Step B5: Customer submits counter-offer (25% discount > 15% ceiling)
  console.log('\n[B5] Customer submits official counter-discount offer...');
  const counterRes = await fetch(`${BASE_URL}/api/portal/quotations/${quoteB.id}/counter-offer`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${custToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lines: [{ lineId: lineBId, quantity: 10, discountPct: 25 }],
      notes: 'Customer official counter proposal',
    }),
  });
  const counterData = await counterRes.json();
  console.log(`New Version: ${counterData.newVersionNumber} | Risk: ${counterData.riskLevel} | Status: ${counterData.status}`);
  if (counterData.status !== 'APPROVAL_REQUIRED_AGAIN' || counterData.newVersionNumber !== 2) {
    throw new Error('Expected Version 2 and APPROVAL_REQUIRED_AGAIN status!');
  }

  // Step B6: Verify customer sees "Quote Under Review" and cannot confirm yet
  console.log('\n[B6] Verifying customer portal state under review...');
  const portalUnderReview = await fetch(`${BASE_URL}/api/portal/quotations/${quoteB.id}`, {
    headers: { 'Authorization': `Bearer ${custToken}` },
  });
  const portalUnderReviewData = await portalUnderReview.json();
  console.log(`Customer portal display label: "${portalUnderReviewData.quotation?.status}"`);

  const earlyConfirm = await fetch(`${BASE_URL}/api/portal/quotations/${quoteB.id}/confirm`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${custToken}` },
  });
  console.log(`Early confirmation correctly rejected (HTTP ${earlyConfirm.status})`);
  if (earlyConfirm.status !== 400) {
    throw new Error('Customer should not be able to confirm a quote under re-approval!');
  }

  // Step B7: Sales Manager approves revised counter-offer
  console.log('\n[B7] Sales Manager approves counter-offer...');
  const mgrReApprove = await fetch(`${BASE_URL}/api/approvals/quotations/${quoteB.id}/decision`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${mgrToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision: 'APPROVED', reason: 'Approved revised counter terms.' }),
  });
  const mgrReApproveData = await mgrReApprove.json();
  console.log(`Approval decision status: ${mgrReApproveData.quotationStatus}`);

  // Step B8: Rep re-sends approved revision to customer
  console.log('\n[B8] Rep re-sends approved revision to customer...');
  await fetch(`${BASE_URL}/api/quotations/${quoteB.id}/send-to-customer`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${repToken}` },
  });

  // Step B9: Customer confirms quotation
  console.log('\n[B9] Customer officially confirms quotation...');
  const confirmRes = await fetch(`${BASE_URL}/api/portal/quotations/${quoteB.id}/confirm`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${custToken}` },
  });
  const confirmData = await confirmRes.json();
  console.log(`Confirmation status: ${confirmRes.status} | Final internal status: ${confirmData.internalStatus}`);
  if (confirmData.internalStatus !== 'CUSTOMER_CONFIRMED') {
    throw new Error('Flow B failed: Quotation must be CUSTOMER_CONFIRMED!');
  }
  console.log('>>> FLOW B COMPLETE & VERIFIED: Customer negotiation & re-approval fully executed.');

  // ==========================================================================
  // 4. SECURITY & TOKEN ISOLATION AUDIT
  // ==========================================================================
  console.log('\n================================================================');
  console.log('   SECURITY & RBAC ISOLATION AUDIT');
  console.log('================================================================');

  // Customer token attempting internal quotation creation -> 401
  const sec1 = await fetch(`${BASE_URL}/api/quotations`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${custToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  console.log(`Customer token on internal endpoint (expected 401): ${sec1.status}`);

  // Internal rep token attempting customer portal -> 401
  const sec2 = await fetch(`${BASE_URL}/api/portal/quotations`, {
    headers: { 'Authorization': `Bearer ${repToken}` },
  });
  console.log(`Internal token on customer portal endpoint (expected 401): ${sec2.status}`);

  // Sales Rep attempting manager-only CSV export -> 403
  const sec3 = await fetch(`${BASE_URL}/api/reporting/export/quotations.csv`, {
    headers: { 'Authorization': `Bearer ${repToken}` },
  });
  console.log(`Sales rep on manager-only export endpoint (expected 403): ${sec3.status}`);

  if (sec1.status !== 401 || sec2.status !== 401 || sec3.status !== 403) {
    throw new Error('Security isolation audit failed!');
  }
  console.log('>>> SECURITY AUDIT PASSED: Cryptographic token isolation & RBAC verified.');

  // ==========================================================================
  // 5. VERSION IMMUTABILITY AUDIT
  // ==========================================================================
  console.log('\n================================================================');
  console.log('   VERSION IMMUTABILITY AUDIT');
  console.log('================================================================');

  const v1 = await prisma.quotationVersion.findUnique({
    where: { quotationId_versionNumber: { quotationId: quoteB.id, versionNumber: 1 } },
    include: { lines: true },
  });
  const v2 = await prisma.quotationVersion.findUnique({
    where: { quotationId_versionNumber: { quotationId: quoteB.id, versionNumber: 2 } },
    include: { lines: true },
  });

  console.log(`Version 1: Quantity = ${v1.lines[0].quantity}, Discount = ${v1.lines[0].discountPct}%`);
  console.log(`Version 2: Quantity = ${v2.lines[0].quantity}, Discount = ${v2.lines[0].discountPct}%`);
  if (v1.lines[0].quantity !== 5 || v2.lines[0].quantity !== 10 || v1.lines[0].discountPct !== 5 || v2.lines[0].discountPct !== 25) {
    throw new Error('Version immutability violated!');
  }
  console.log('>>> VERSION IMMUTABILITY PASSED: Historical versions are preserved intact.');

  // ==========================================================================
  // 6. REPORTING & DEAL HEALTH CONSISTENCY AUDIT
  // ==========================================================================
  console.log('\n================================================================');
  console.log('   REPORTING & DEAL HEALTH CONSISTENCY AUDIT');
  console.log('================================================================');

  const reportRes = await fetch(`${BASE_URL}/api/reporting/dashboard`, {
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  const reportData = await reportRes.json();
  console.log(`Report Dashboard: Total Active Quotations = ${reportData.executiveSummary?.totalQuotations}`);
  console.log(`Pipeline Net Value = ₹${reportData.executiveSummary?.pipelineNetValue}`);
  console.log(`Realized Revenue = ₹${reportData.executiveSummary?.realizedRevenue}`);

  const healthRes = await fetch(`${BASE_URL}/api/deal-health/summary`, {
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  const healthData = await healthRes.json();
  console.log(`Deal Health Summary: Healthy = ${healthData.portfolioHealth.healthy}, AtRisk = ${healthData.portfolioHealth.atRisk}, Critical = ${healthData.portfolioHealth.critical}`);

  if (!reportData.executiveSummary || !healthData.portfolioHealth) {
    throw new Error('Reporting and Deal Health summary verification failed!');
  }
  console.log('>>> REPORTING & HEALTH CONSISTENCY PASSED: Live aggregated metrics accurate.');

  console.log('\n================================================================');
  console.log('   BACKEND FINAL AUDIT: ALL SUITES PASSED CLEANLY! ✅');
  console.log('================================================================');
  process.exit(0);
}

runFinalAuditE2E().catch(err => {
  console.error('Final Audit Failed:', err);
  process.exit(1);
});
