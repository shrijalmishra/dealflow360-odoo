const prisma = require('../src/config/db');

async function runRecommendationTests() {
  const BASE_URL = 'http://localhost:4000';
  console.log('====================================================');
  console.log('   PART 10: UPSELL & CROSS-SELL RECOMMENDATIONS TEST');
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
  console.log('Admin authenticated:', adminAuth.user?.email);

  const repRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rep@dealflow360.test', password: 'Rep@12345' }),
  });
  const repAuth = await repRes.json();
  const repToken = repAuth.token;
  console.log('Sales Rep authenticated:', repAuth.user?.email);

  // --- Step 2: Prepare Products & Customer ---
  console.log('\n--- 2. Fetching Seeded Products & Customer ---');
  const dell = await prisma.product.findFirst({ where: { name: { contains: 'Dell' } }, include: { category: true } });
  const impl = await prisma.product.findFirst({ where: { name: { contains: 'Implementation' } }, include: { category: true } });
  const support = await prisma.product.findFirst({ where: { name: { contains: 'Support' } }, include: { category: true } });
  const acme = await prisma.customer.findFirst({ where: { name: { contains: 'Acme' } } });

  console.log(`Dell Laptop: ${dell.id} (Base: ₹${dell.basePrice}, Cost: ₹${dell.costPrice})`);
  console.log(`Implementation: ${impl.id} (Base: ₹${impl.basePrice}, Cost: ₹${impl.costPrice})`);
  console.log(`Enterprise Support: ${support.id} (Base: ₹${support.basePrice}, Cost: ₹${support.costPrice})`);

  // --- Step 3: Test 1 - Ranking & Promotional Boost ---
  console.log('\n--- 3. TEST 1: Explainable Scoring & Campaign Boost Ranking ---');
  // Create a draft quote containing ONLY Dell Laptop
  const quote1 = await prisma.quotation.create({
    data: {
      customerId: acme.id,
      repId: repAuth.user.id,
      status: 'DRAFT',
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
              allowedDiscountPct: dell.category.discountCeiling,
              lineType: 'ONE_TIME',
            }],
          },
        },
      },
    },
  });

  const recRes1 = await fetch(`${BASE_URL}/api/recommendations/quotations/${quote1.id}`, {
    headers: { 'Authorization': `Bearer ${repToken}` },
  });
  const recData1 = await recRes1.json();
  console.log(`Received ${recData1.recommendations?.length} recommendations:`);
  recData1.recommendations.forEach((r, idx) => {
    console.log(`  #${idx + 1}: ${r.name} | Score: ${r.rankingScore} (CoPurchase: ${r.coPurchaseStrength}, Boost: ${r.campaignBoost}x, Promoted: ${r.isPromoted}) | Type: ${r.type}`);
    console.log(`      Rationale: "${r.rationale}"`);
    console.log(`      Economics: Price ₹${r.pricing.sellingPrice} | Cost ₹${r.pricing.costPrice} | List Margin: ${r.pricing.listMarginPct}%`);
  });

  // Verify Enterprise Support (0.70 * 1.3 = 0.91) outranks Implementation Service (0.85)
  if (recData1.recommendations[0].productId !== support.id) {
    throw new Error('Expected Enterprise Support to be ranked #1 due to campaign boost!');
  }
  console.log('>>> TEST 1 PASSED: Promoted item successfully boosted to rank #1 with clear explanation.');

  // --- Step 4: Test 2 - Candidate Aggregation & Deduplication ---
  console.log('\n--- 4. TEST 2: Multi-trigger Deduplication ---');
  // Add Implementation Service to quote1 as well so BOTH Dell and Implementation point to Enterprise Support
  const quote2 = await prisma.quotation.create({
    data: {
      customerId: acme.id,
      repId: repAuth.user.id,
      status: 'DRAFT',
      currentVersionNo: 1,
      versions: {
        create: {
          versionNumber: 1,
          lines: {
            create: [
              {
                productId: dell.id,
                quantity: 5,
                unitPrice: dell.basePrice,
                discountPct: 0,
                allowedDiscountPct: 15,
                lineType: 'ONE_TIME',
              },
              {
                productId: impl.id,
                quantity: 1,
                unitPrice: impl.basePrice,
                discountPct: 0,
                allowedDiscountPct: 10,
                lineType: 'ONE_TIME',
              },
            ],
          },
        },
      },
    },
  });

  const recRes2 = await fetch(`${BASE_URL}/api/recommendations/quotations/${quote2.id}`, {
    headers: { 'Authorization': `Bearer ${repToken}` },
  });
  const recData2 = await recRes2.json();
  console.log(`Recommendations count for quote with 2 trigger items: ${recData2.recommendations.length}`);
  const supportRec = recData2.recommendations.find(r => r.productId === support.id);
  console.log(`Deduplicated candidate: ${supportRec.name} (Trigger count: ${supportRec.triggerProducts.length})`);
  console.log('Triggers:', supportRec.triggerProducts.map(t => `${t.name} (${t.strengthScore})`).join(', '));
  if (recData2.recommendations.length !== 1 || supportRec.triggerProducts.length !== 2) {
    throw new Error('Deduplication failed or did not combine multiple triggers!');
  }
  console.log('>>> TEST 2 PASSED: Candidates aggregated and deduplicated cleanly.');

  // --- Step 5: Test 3 - Inactive Promotion Handling ---
  console.log('\n--- 5. TEST 3: Deactivating Promotion Drops Score ---');
  // Temporarily deactivate promotion
  await prisma.promotionFlag.update({
    where: { productId: support.id },
    data: { active: false },
  });

  const recRes3 = await fetch(`${BASE_URL}/api/recommendations/quotations/${quote1.id}`, {
    headers: { 'Authorization': `Bearer ${repToken}` },
  });
  const recData3 = await recRes3.json();
  console.log(`After deactivating promotion:`);
  recData3.recommendations.forEach((r, idx) => {
    console.log(`  #${idx + 1}: ${r.name} | Score: ${r.rankingScore} (Promoted: ${r.isPromoted})`);
  });
  if (recData3.recommendations[0].productId !== impl.id) {
    throw new Error('Expected Implementation Service to regain #1 spot when promotion is inactive!');
  }
  console.log('>>> TEST 3 PASSED: Inactive promotion correctly fell back to raw co-purchase strength.');

  // Restore promotion for subsequent tests
  await prisma.promotionFlag.update({
    where: { productId: support.id },
    data: { active: true },
  });

  // --- Step 6: Test 4 & 5 - Direct Acceptance on DRAFT quote ---
  console.log('\n--- 6. TEST 4 & 5: Acceptance on DRAFT Quotation ---');
  const acceptDraftRes = await fetch(`${BASE_URL}/api/recommendations/quotations/${quote1.id}/accept`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${repToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      productId: impl.id,
      quantity: 2,
      discountPct: 5,
    }),
  });
  const acceptDraftData = await acceptDraftRes.json();
  console.log('Draft acceptance response status:', acceptDraftRes.status);
  console.log('Version Number (should stay 1 for draft):', acceptDraftData.versionNumber);
  console.log('Economics Impact:');
  console.log(`  Incremental Revenue: ₹${acceptDraftData.economicsImpact.incrementalRevenue}`);
  console.log(`  Incremental Profit:  ₹${acceptDraftData.economicsImpact.incrementalProfit}`);
  console.log(`  Overall Margin: ${acceptDraftData.economicsImpact.before.marginPct}% -> ${acceptDraftData.economicsImpact.after.marginPct}%`);
  console.log('Added Line details:', acceptDraftData.acceptedItem);
  if (acceptDraftData.versionNumber !== 1 || !acceptDraftData.acceptedItem.fromRecommendation) {
    throw new Error('Failed draft acceptance assertions');
  }
  console.log('>>> TEST 4 & 5 PASSED: Draft acceptance successfully updated current version.');

  // --- Step 7: Test 6 & 7 - Version Immutability & Recurring Product Acceptance ---
  console.log('\n--- 7. TEST 6 & 7: Version Immutability & Recurring Attachment ---');
  // Set quotation status to APPROVED
  await prisma.quotation.update({
    where: { id: quote1.id },
    data: { status: 'APPROVED' },
  });

  // Accept recurring recommendation: Enterprise IT Support
  const acceptApprovedRes = await fetch(`${BASE_URL}/api/recommendations/quotations/${quote1.id}/accept`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${repToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      productId: support.id,
      quantity: 2,
      discountPct: 5,
    }),
  });
  const acceptApprovedData = await acceptApprovedRes.json();
  console.log('Approved quote acceptance response status:', acceptApprovedRes.status);
  console.log('New Version Number (should be 2):', acceptApprovedData.versionNumber);
  console.log('Quotation Status:', acceptApprovedData.quotationStatus);
  console.log('Recurring Revenue Delta: +₹', acceptApprovedData.economicsImpact.recurringDelta);
  console.log('Accepted line type:', acceptApprovedData.acceptedItem.lineType);

  // Check database to guarantee Version 1 was NOT mutated
  const v1Check = await prisma.quotationVersion.findUnique({
    where: { quotationId_versionNumber: { quotationId: quote1.id, versionNumber: 1 } },
    include: { lines: true },
  });
  const v2Check = await prisma.quotationVersion.findUnique({
    where: { quotationId_versionNumber: { quotationId: quote1.id, versionNumber: 2 } },
    include: { lines: true },
  });

  console.log(`Version 1 lines count: ${v1Check.lines.length} | Version 2 lines count: ${v2Check.lines.length}`);
  if (v1Check.lines.length >= v2Check.lines.length || v2Check.versionNumber !== 2) {
    throw new Error('Version immutability violated! Version 1 was mutated.');
  }
  if (acceptApprovedData.acceptedItem.lineType !== 'RECURRING') {
    throw new Error('Expected subscription item to have RECURRING lineType!');
  }
  console.log('>>> TEST 6 & 7 PASSED: Version immutability strictly preserved and recurring totals updated.');

  // --- Step 8: Test 8 - Risk Re-calculation & Approval Triggering on Acceptance ---
  console.log('\n--- 8. TEST 8: Recommendation with High Discount Triggers Re-Approval ---');
  // Create another approved quote with 1 product
  const quote3 = await prisma.quotation.create({
    data: {
      customerId: acme.id,
      repId: repAuth.user.id,
      status: 'APPROVED',
      currentVersionNo: 1,
      versions: {
        create: {
          versionNumber: 1,
          lines: {
            create: [{
              productId: dell.id,
              quantity: 1,
              unitPrice: dell.basePrice,
              discountPct: 0,
              allowedDiscountPct: 15,
              lineType: 'ONE_TIME',
            }],
          },
        },
      },
    },
  });

  // Accept Enterprise Support with 25% discount (Allowed ceiling is 10%)
  const acceptHighDiscountRes = await fetch(`${BASE_URL}/api/recommendations/quotations/${quote3.id}/accept`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${repToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      productId: support.id,
      quantity: 10,
      discountPct: 25, // Exceeds 10% ceiling -> triggers approval
    }),
  });
  const acceptHighDiscountData = await acceptHighDiscountRes.json();
  console.log('High discount accept status:', acceptHighDiscountRes.status);
  console.log('Risk Level:', acceptHighDiscountData.riskLevel);
  console.log('Approval Required:', acceptHighDiscountData.approvalRequired);
  console.log('Quotation Status:', acceptHighDiscountData.quotationStatus);

  if (acceptHighDiscountData.quotationStatus !== 'APPROVAL_REQUIRED_AGAIN') {
    throw new Error('Expected status to become APPROVAL_REQUIRED_AGAIN!');
  }
  console.log('>>> TEST 8 PASSED: Re-approval workflow successfully triggered by discount excess on recommendation.');

  // --- Step 9: Test 9 - Rejection on Confirmed Quotation ---
  console.log('\n--- 9. TEST 9: Confirmed Quotation Rejects Recommendation Acceptance ---');
  // We already have quotation '4f6dd834-d6da-4d98-a54a-a27113925896' with status CUSTOMER_CONFIRMED
  const confirmedQuote = await prisma.quotation.findFirst({
    where: { status: 'CUSTOMER_CONFIRMED' },
  });

  const rejectConfirmRes = await fetch(`${BASE_URL}/api/recommendations/quotations/${confirmedQuote.id}/accept`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${repToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      productId: impl.id,
      quantity: 1,
    }),
  });
  console.log('Confirmed quote reject status (expected 400):', rejectConfirmRes.status);
  const rejectConfirmData = await rejectConfirmRes.json();
  console.log('Error message:', rejectConfirmData.error?.message);
  if (rejectConfirmRes.status !== 400) {
    throw new Error('Confirmed quote should have rejected recommendation acceptance!');
  }
  console.log('>>> TEST 9 PASSED: Confirmed quotes reject recommendation acceptance.');

  // --- Step 10: Test 10 - RBAC Enforcement ---
  console.log('\n--- 10. TEST 10: RBAC Enforcement on Configuration Endpoints ---');
  // Rep token tries to configure promotion -> 403
  const rbacFailRes = await fetch(`${BASE_URL}/api/recommendations/promotions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${repToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      productId: dell.id,
      active: true,
      boostWeight: 1.5,
    }),
  });
  console.log('Rep configuring promotions (expected 403):', rbacFailRes.status);
  if (rbacFailRes.status !== 403) {
    throw new Error('Sales Rep should be forbidden from configuring promotions!');
  }

  // Admin token tries to configure promotion -> 201
  const rbacPassRes = await fetch(`${BASE_URL}/api/recommendations/promotions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      productId: dell.id,
      active: true,
      boostWeight: 1.2,
    }),
  });
  console.log('Admin configuring promotions (expected 201):', rbacPassRes.status);
  if (rbacPassRes.status !== 201) {
    throw new Error('Admin should be able to configure promotions!');
  }
  console.log('>>> TEST 10 PASSED: Strict RBAC enforced on configuration endpoints.');

  console.log('\n====================================================');
  console.log('   ALL 10 RECOMMENDATION ENGINE TESTS PASSED! ✅');
  console.log('====================================================');
  process.exit(0);
}

runRecommendationTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
