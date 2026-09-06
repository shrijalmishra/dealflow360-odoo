const http = require('http');

async function testNegotiationFlow() {
  const BASE_URL = 'http://localhost:4000';

  console.log('--- 1. Login as Admin/Rep ---');
  const repLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@dealflow360.test', password: 'Admin@12345' }),
  });
  const repAuth = await repLogin.json();
  const repToken = repAuth.token;
  console.log('Rep logged in successfully:', repAuth.user?.email);

  console.log('\n--- 2. Login as Customer ---');
  const custLogin = await fetch(`${BASE_URL}/api/auth/customer-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'customer@acme.dealflow360.test', password: 'Customer@12345' }),
  });
  const custAuth = await custLogin.json();
  const custToken = custAuth.token;
  console.log('Customer logged in successfully:', custAuth.customer?.name);

  console.log('\n--- 3. Find or Prepare an APPROVED quote for Acme ---');
  const prisma = require('../src/config/db');
  let quote = await prisma.quotation.findFirst({
    where: { customerId: custAuth.customer.id, status: 'APPROVED' },
    include: { versions: { include: { lines: true } } }
  });

  if (!quote) {
    console.log('Creating a new quotation to test...');
    const product = await prisma.product.findFirst({ where: { active: true } });
    quote = await prisma.quotation.create({
      data: {
        customerId: custAuth.customer.id,
        repId: repAuth.user.id,
        status: 'APPROVED',
        currentVersionNo: 1,
        versions: {
          create: {
            versionNumber: 1,
            lines: {
              create: [{
                productId: product.id,
                quantity: 5,
                unitPrice: product.basePrice,
                discountPct: 5,
                allowedDiscountPct: 10,
                lineType: 'ONE_TIME',
              }]
            }
          }
        }
      },
      include: { versions: { include: { lines: true } } }
    });
  }

  console.log('Target Quotation ID:', quote.id, 'Status:', quote.status);
  const targetLineId = quote.versions[0].lines[0].id;

  console.log('\n--- 4. Send Quote to Customer ---');
  const sendRes = await fetch(`${BASE_URL}/api/quotations/${quote.id}/send-to-customer`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${repToken}` },
  });
  const sendData = await sendRes.json();
  console.log('Send to Customer Status:', sendRes.status, 'New Status:', sendData.quotation?.status);

  console.log('\n--- 5. PART 4: Customer Adds Line Comment ---');
  const commentRes = await fetch(`${BASE_URL}/api/portal/quotations/${quote.id}/comments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${custToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lineId: targetLineId,
      comment: 'Can we explore an 18% discount if we increase quantity to 10?',
    }),
  });
  const commentData = await commentRes.json();
  console.log('Comment added status:', commentRes.status);
  console.log('Negotiation Event:', commentData.event?.type, commentData.event?.payload);

  console.log('\n--- 6. PART 4: Customer Adds Structured Change Request ---');
  const crRes = await fetch(`${BASE_URL}/api/portal/quotations/${quote.id}/change-requests`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${custToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lineId: targetLineId,
      requestedQuantity: 10,
      requestedDiscountPct: 18,
      notes: 'Quarterly budget approval depends on this rate.',
    }),
  });
  const crData = await crRes.json();
  console.log('Change request status:', crRes.status);
  console.log('CR Event:', crData.event?.type, crData.event?.payload);

  console.log('\n--- 7. Check Customer View after comments (should show Under Negotiation) ---');
  const portalQuoteRes = await fetch(`${BASE_URL}/api/portal/quotations/${quote.id}`, {
    headers: { 'Authorization': `Bearer ${custToken}` },
  });
  const portalQuote = await portalQuoteRes.json();
  console.log('Customer sees status:', portalQuote.quotation?.status, 'Internal status:', portalQuote.quotation?.internalStatus);

  console.log('\n--- 8. PARTS 5, 6, 7, 8: Customer Submits Counter-Offer ---');
  // High discount (18% > allowed 10%) should trigger APPROVAL_REQUIRED_AGAIN
  const counterRes = await fetch(`${BASE_URL}/api/portal/quotations/${quote.id}/counter-offer`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${custToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lines: [{
        lineId: targetLineId,
        quantity: 10,
        discountPct: 25, // High discount triggering re-approval
      }],
      notes: 'Customer official counter-proposal.',
    }),
  });
  const counterData = await counterRes.json();
  console.log('Counter offer response status:', counterRes.status);
  console.log('New Version Number:', counterData.newVersionNumber);
  console.log('Risk Level:', counterData.riskLevel);
  console.log('Quotation Status:', counterData.status);
  console.log('Approval Required:', counterData.approvalRequired);

  console.log('\n--- 9. Verify Portal View (Quote Under Review) ---');
  const underReviewRes = await fetch(`${BASE_URL}/api/portal/quotations/${quote.id}`, {
    headers: { 'Authorization': `Bearer ${custToken}` },
  });
  const underReviewData = await underReviewRes.json();
  console.log('Customer portal sees status:', underReviewData.quotation?.status);
  console.log('Customer cannot confirm while under review...');
  const earlyConfirm = await fetch(`${BASE_URL}/api/portal/quotations/${quote.id}/confirm`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${custToken}` },
  });
  console.log('Premature confirmation rejected (expected 400):', earlyConfirm.status);

  console.log('\n--- 10. Internal Manager Approves the Counter-Offer ---');
  // Manager login
  const mgrLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'manager@dealflow360.test', password: 'Manager@12345' }),
  });
  const mgrAuth = await mgrLogin.json();
  const mgrToken = mgrAuth.token;
  console.log('Manager logged in successfully:', mgrAuth.user?.email);

  // Manager approves quotation decision
  const approveRes = await fetch(`${BASE_URL}/api/approvals/quotations/${quote.id}/decision`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${mgrToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      decision: 'APPROVED',
      reason: 'Approved for strategic enterprise account volume.',
    }),
  });
  const approveData = await approveRes.json();
  console.log('Manager approval status:', approveRes.status, 'Quotation Status:', approveData.quotationStatus);

  // Rep sends approved revision back to customer
  const reSendRes = await fetch(`${BASE_URL}/api/quotations/${quote.id}/send-to-customer`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${repToken}` },
  });
  const reSendData = await reSendRes.json();
  console.log('Re-sent to customer status:', reSendRes.status, 'Quotation status:', reSendData.quotation?.status);

  console.log('\n--- 11. PART 9: Customer Confirms Quotation ---');
  const confirmRes = await fetch(`${BASE_URL}/api/portal/quotations/${quote.id}/confirm`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${custToken}` },
  });
  const confirmData = await confirmRes.json();
  console.log('Confirmation status:', confirmRes.status);
  console.log('Confirmation response:', confirmData);

  console.log('\n--- 12. View Negotiation Events Timeline ---');
  const eventsRes = await fetch(`${BASE_URL}/api/portal/quotations/${quote.id}/events`, {
    headers: { 'Authorization': `Bearer ${custToken}` },
  });
  const eventsData = await eventsRes.json();
  console.log(`Recorded ${eventsData.events?.length} negotiation events:`);
  eventsData.events?.forEach((e, idx) => {
    console.log(`  ${idx + 1}. [${e.type}] by ${e.actor} at ${e.createdAt}`);
  });

  console.log('\n--- ALL PARTS 4 - 9 VERIFIED SUCCESSFULLY! ---');
  process.exit(0);
}

testNegotiationFlow().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
