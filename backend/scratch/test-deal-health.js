const prisma = require('../src/config/db');

async function runDealHealthTests() {
  const BASE_URL = 'http://localhost:4000';
  console.log('====================================================');
  console.log('   PART 11: DEAL HEALTH & ANOMALY DETECTION TEST');
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

  const repRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rep@dealflow360.test', password: 'Rep@12345' }),
  });
  const repAuth = await repRes.json();
  const repToken = repAuth.token;

  const acme = await prisma.customer.findFirst({ where: { name: { contains: 'Acme' } } });
  const dell = await prisma.product.findFirst({ where: { name: { contains: 'Dell' } } });

  // Clean up any old test alerts
  await prisma.dealAlert.deleteMany();

  // --- Step 2: Test 1 - Healthy Quotation ---
  console.log('\n--- 2. TEST 1: Healthy Quotation ---');
  const healthyQuote = await prisma.quotation.create({
    data: {
      customerId: acme.id,
      repId: repAuth.user.id,
      status: 'DRAFT',
      currentVersionNo: 1,
      lastActivityAt: new Date(),
      versions: {
        create: {
          versionNumber: 1,
          lines: {
            create: [{
              productId: dell.id,
              quantity: 2,
              unitPrice: dell.basePrice,
              discountPct: 0,
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
  });

  const hRes = await fetch(`${BASE_URL}/api/deal-health/quotations/${healthyQuote.id}`, {
    headers: { 'Authorization': `Bearer ${repToken}` },
  });
  const hData = await hRes.json();
  console.log(`Healthy Quote Score: ${hData.healthScore} | Level: ${hData.healthLevel} | Anomalies: ${hData.anomalies.length}`);
  if (hData.healthScore !== 100 || hData.healthLevel !== 'HEALTHY' || hData.anomalies.length !== 0) {
    throw new Error('Healthy quotation test failed!');
  }
  console.log('>>> TEST 1 PASSED: Baseline quotation evaluated as 100 HEALTHY.');

  // --- Step 3: Test 2 - Stale Quotation ---
  console.log('\n--- 3. TEST 2: Stale Quotation Detection ---');
  const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000); // 72 hours ago
  const staleQuote = await prisma.quotation.create({
    data: {
      customerId: acme.id,
      repId: repAuth.user.id,
      status: 'DRAFT',
      currentVersionNo: 1,
      lastActivityAt: threeDaysAgo,
      createdAt: threeDaysAgo,
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
  });

  const staleRes = await fetch(`${BASE_URL}/api/deal-health/quotations/${staleQuote.id}`, {
    headers: { 'Authorization': `Bearer ${repToken}` },
  });
  const staleData = await staleRes.json();
  console.log(`Stale Quote Score: ${staleData.healthScore} | Level: ${staleData.healthLevel}`);
  console.log('Detected Anomaly:', staleData.anomalies[0]);
  if (!staleData.anomalies.some(a => a.type === 'STALLED')) {
    throw new Error('Expected STALLED anomaly for 72h inactive quote!');
  }
  console.log('>>> TEST 2 PASSED: Stalled quote detected with explainable inactivity deduction.');

  // --- Step 4: Test 3 - Discount Anomaly ---
  console.log('\n--- 4. TEST 3: Discount Anomaly Detection ---');
  const discountQuote = await prisma.quotation.create({
    data: {
      customerId: acme.id,
      repId: repAuth.user.id,
      status: 'DRAFT',
      currentVersionNo: 1,
      lastActivityAt: new Date(),
      versions: {
        create: {
          versionNumber: 1,
          lines: {
            create: [{
              productId: dell.id,
              quantity: 5,
              unitPrice: dell.basePrice,
              discountPct: 35,
              allowedDiscountPct: 15,
            }],
          },
          riskAssessment: {
            create: {
              riskLevel: 'HIGH',
              blendedScore: 75,
              worstLineExcessPct: 20,
              totalExcessValue: 85000,
            },
          },
        },
      },
    },
  });

  const discRes = await fetch(`${BASE_URL}/api/deal-health/quotations/${discountQuote.id}`, {
    headers: { 'Authorization': `Bearer ${repToken}` },
  });
  const discData = await discRes.json();
  console.log(`Discount Anomaly Score: ${discData.healthScore} | Level: ${discData.healthLevel}`);
  console.log('Detected Anomaly:', discData.anomalies[0]);
  if (!discData.anomalies.some(a => a.type === 'DISCOUNT_ANOMALY' && a.severity === 'HIGH')) {
    throw new Error('Expected HIGH DISCOUNT_ANOMALY!');
  }
  console.log('>>> TEST 3 PASSED: Discount anomaly detected with existing risk engine evidence.');

  // --- Step 5: Test 4 - Approval Delay ---
  console.log('\n--- 5. TEST 4: Approval Delay Detection ---');
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const approvalQuote = await prisma.quotation.create({
    data: {
      customerId: acme.id,
      repId: repAuth.user.id,
      status: 'PENDING_MANAGER_APPROVAL',
      currentVersionNo: 1,
      lastActivityAt: twoDaysAgo,
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
            }],
          },
          approvalRequest: {
            create: {
              currentStep: 'SALES_MANAGER',
              status: 'PENDING',
              createdAt: twoDaysAgo,
            },
          },
        },
      },
    },
  });

  const appRes = await fetch(`${BASE_URL}/api/deal-health/quotations/${approvalQuote.id}`, {
    headers: { 'Authorization': `Bearer ${repToken}` },
  });
  const appData = await appRes.json();
  console.log(`Approval Delay Score: ${appData.healthScore} | Level: ${appData.healthLevel}`);
  const appAnomaly = appData.anomalies.find(a => a.type === 'APPROVAL_DELAY');
  console.log('Detected Approval Delay:', appAnomaly);
  if (!appAnomaly || appAnomaly.escalationRole !== 'SALES_MANAGER') {
    throw new Error('Expected APPROVAL_DELAY anomaly with SALES_MANAGER escalation!');
  }
  console.log('>>> TEST 4 PASSED: Approval delay identified with role escalation.');

  // --- Step 6: Test 5 - Prolonged Negotiation Delay ---
  console.log('\n--- 6. TEST 5: Negotiation Delay Detection ---');
  const negQuote = await prisma.quotation.create({
    data: {
      customerId: acme.id,
      repId: repAuth.user.id,
      status: 'UNDER_NEGOTIATION',
      currentVersionNo: 1,
      lastActivityAt: threeDaysAgo,
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
            }],
          },
        },
      },
      negotiationEvents: {
        create: {
          type: 'LINE_COMMENT',
          actor: 'customer',
          payload: { comment: 'Old comment' },
          createdAt: threeDaysAgo,
        },
      },
    },
  });

  const negRes = await fetch(`${BASE_URL}/api/deal-health/quotations/${negQuote.id}`, {
    headers: { 'Authorization': `Bearer ${repToken}` },
  });
  const negData = await negRes.json();
  console.log(`Negotiation Delay Score: ${negData.healthScore} | Level: ${negData.healthLevel}`);
  const negAnomaly = negData.anomalies.find(a => a.type === 'NEGOTIATION_DELAY');
  console.log('Detected Negotiation Delay:', negAnomaly);
  if (!negAnomaly) {
    throw new Error('Expected NEGOTIATION_DELAY anomaly!');
  }
  console.log('>>> TEST 5 PASSED: Prolonged negotiation flagged.');

  // --- Step 7: Test 6 - Delivery Slippage & Backorder ---
  console.log('\n--- 7. TEST 6: Delivery Slippage & Backorder Detection ---');
  const deliveryQuote = await prisma.quotation.create({
    data: {
      customerId: acme.id,
      repId: repAuth.user.id,
      status: 'FULFILLMENT',
      currentVersionNo: 1,
      lastActivityAt: new Date(),
      versions: {
        create: {
          versionNumber: 1,
          lines: {
            create: [{
              productId: dell.id,
              quantity: 10,
              unitPrice: dell.basePrice,
              discountPct: 0,
              allowedDiscountPct: 15,
            }],
          },
        },
      },
      fulfillments: {
        create: {
          status: 'BACKORDERED',
          backorders: {
            create: {
              productId: dell.id,
              qtyPending: 6,
            },
          },
        },
      },
    },
  });

  const delRes = await fetch(`${BASE_URL}/api/deal-health/quotations/${deliveryQuote.id}`, {
    headers: { 'Authorization': `Bearer ${repToken}` },
  });
  const delData = await delRes.json();
  console.log(`Delivery Slippage Score: ${delData.healthScore} | Level: ${delData.healthLevel}`);
  const delAnomaly = delData.anomalies.find(a => a.type === 'DELIVERY_RISK');
  console.log('Detected Delivery Risk:', delAnomaly);
  if (!delAnomaly || delAnomaly.severity !== 'CRITICAL') {
    throw new Error('Expected CRITICAL DELIVERY_RISK anomaly due to backorder!');
  }
  console.log('>>> TEST 6 PASSED: Delivery slippage detected from persisted backorders.');

  // --- Step 8: Test 7 - Payment Delay Detection ---
  console.log('\n--- 8. TEST 7: Payment Delay Detection ---');
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  const paymentQuote = await prisma.quotation.create({
    data: {
      customerId: acme.id,
      repId: repAuth.user.id,
      status: 'INVOICED',
      currentVersionNo: 1,
      lastActivityAt: new Date(),
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
            }],
          },
        },
      },
      invoices: {
        create: {
          type: 'ONE_TIME',
          total: 85000,
          status: 'UNPAID',
          createdAt: tenDaysAgo,
        },
      },
    },
  });

  const payRes = await fetch(`${BASE_URL}/api/deal-health/quotations/${paymentQuote.id}`, {
    headers: { 'Authorization': `Bearer ${repToken}` },
  });
  const payData = await payRes.json();
  console.log(`Payment Delay Score: ${payData.healthScore} | Level: ${payData.healthLevel}`);
  const payAnomaly = payData.anomalies.find(a => a.type === 'PAYMENT_DELAY');
  console.log('Detected Payment Delay:', payAnomaly);
  if (!payAnomaly) {
    throw new Error('Expected PAYMENT_DELAY anomaly for 10-day overdue invoice!');
  }
  console.log('>>> TEST 7 PASSED: Payment delay detected with finance escalation.');

  // --- Step 9: Test 8 - Multiple Compound Anomalies ---
  console.log('\n--- 9. TEST 8: Compound Anomalies Combining Into Health Score ---');
  // Combine high discount + approval delay
  const compoundQuote = await prisma.quotation.create({
    data: {
      customerId: acme.id,
      repId: repAuth.user.id,
      status: 'PENDING_FINANCE_APPROVAL',
      currentVersionNo: 1,
      lastActivityAt: twoDaysAgo,
      versions: {
        create: {
          versionNumber: 1,
          lines: {
            create: [{
              productId: dell.id,
              quantity: 10,
              unitPrice: dell.basePrice,
              discountPct: 40,
              allowedDiscountPct: 15,
            }],
          },
          riskAssessment: {
            create: {
              riskLevel: 'HIGH',
              blendedScore: 85,
              worstLineExcessPct: 25,
              totalExcessValue: 212500,
            },
          },
          approvalRequest: {
            create: {
              currentStep: 'FINANCE_OPS',
              status: 'PENDING',
              createdAt: twoDaysAgo,
            },
          },
        },
      },
    },
  });

  const compRes = await fetch(`${BASE_URL}/api/deal-health/quotations/${compoundQuote.id}`, {
    headers: { 'Authorization': `Bearer ${repToken}` },
  });
  const compData = await compRes.json();
  console.log(`Compound Quote Score: ${compData.healthScore} | Level: ${compData.healthLevel}`);
  console.log('Factors breakdown:');
  compData.factors.forEach(f => console.log(`  [${f.severity}] ${f.type}: ${f.impact} pts - ${f.message}`));
  if (compData.healthLevel !== 'CRITICAL' || compData.factors.length < 2) {
    throw new Error('Expected CRITICAL compound score with multiple factors!');
  }
  console.log('>>> TEST 8 PASSED: Compound factors combine explainably into CRITICAL health.');

  // --- Step 10: Test 9 - Prevent Duplicate Active Alerts ---
  console.log('\n--- 10. TEST 9: Idempotent Alert Generation (No Duplicates) ---');
  // Call refresh endpoint twice on compound quote
  await fetch(`${BASE_URL}/api/deal-health/quotations/${compoundQuote.id}/refresh`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${repToken}` },
  });
  await fetch(`${BASE_URL}/api/deal-health/quotations/${compoundQuote.id}/refresh`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${repToken}` },
  });

  const alertsCheck = await prisma.dealAlert.findMany({
    where: { quotationId: compoundQuote.id },
  });
  console.log(`Alerts in DB for compound quote: ${alertsCheck.length}`);
  const alertTypes = alertsCheck.map(a => a.type);
  const uniqueAlertTypes = new Set(alertTypes);
  if (alertsCheck.length !== uniqueAlertTypes.size) {
    throw new Error('Duplicate alerts created for the same quotation and anomaly type!');
  }
  console.log('>>> TEST 9 PASSED: Alert generation is strictly idempotent; no duplicates created.');

  // --- Step 11: Test 10 - Acknowledge and Resolve Alerts ---
  console.log('\n--- 11. TEST 10: Acknowledge & Resolve Alert Workflow ---');
  const targetAlert = alertsCheck[0];
  console.log(`Target alert: ${targetAlert.id} (status: ${targetAlert.status})`);

  // Rep acknowledges alert
  const ackRes = await fetch(`${BASE_URL}/api/deal-health/alerts/${targetAlert.id}/acknowledge`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${repToken}` },
  });
  const ackData = await ackRes.json();
  console.log(`After acknowledge: status = ${ackData.alert?.status}`);
  if (ackData.alert?.status !== 'ACKNOWLEDGED') {
    throw new Error('Alert acknowledge failed!');
  }

  // Admin resolves alert
  const resAlertRes = await fetch(`${BASE_URL}/api/deal-health/alerts/${targetAlert.id}/resolve`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  const resAlertData = await resAlertRes.json();
  console.log(`After resolve: status = ${resAlertData.alert?.status}, resolved = ${resAlertData.alert?.resolved}`);
  if (resAlertData.alert?.status !== 'RESOLVED' || !resAlertData.alert?.resolved) {
    throw new Error('Alert resolve failed!');
  }
  console.log('>>> TEST 10 PASSED: Acknowledge and resolve lifecycle verified.');

  // --- Step 12: Test 11 - RBAC on Alert Resolution ---
  console.log('\n--- 12. TEST 11: RBAC on Alert Resolution ---');
  // Rep tries to resolve an alert -> should be 403 Forbidden
  const otherAlert = alertsCheck[1];
  const rbacRes = await fetch(`${BASE_URL}/api/deal-health/alerts/${otherAlert.id}/resolve`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${repToken}` },
  });
  console.log(`Rep resolving alert (expected 403): ${rbacRes.status}`);
  if (rbacRes.status !== 403) {
    throw new Error('Sales Rep should be forbidden from resolving alerts!');
  }
  console.log('>>> TEST 11 PASSED: Strict RBAC enforced on alert resolution.');

  // --- Step 13: Test 12 - Portfolio Dashboard Summary ---
  console.log('\n--- 13. TEST 12: Portfolio Dashboard Summary ---');
  const sumRes = await fetch(`${BASE_URL}/api/deal-health/summary`, {
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  const sumData = await sumRes.json();
  console.log('Summary metrics:');
  console.log(`  Total Active Quotes: ${sumData.totalActiveQuotations}`);
  console.log(`  Portfolio Health: Healthy=${sumData.portfolioHealth.healthy}, AtRisk=${sumData.portfolioHealth.atRisk}, Critical=${sumData.portfolioHealth.critical}`);
  console.log(`  Anomalies: Stalled=${sumData.anomaliesDetected.stalledQuotations}, ApprovalDelays=${sumData.anomaliesDetected.approvalDelays}, DeliverySlippage=${sumData.anomaliesDetected.deliverySlippage}, DiscountAnomalies=${sumData.anomaliesDetected.discountAnomalies}`);
  console.log(`  Open Alerts: ${sumData.alertsSummary.totalOpenAlerts}`);

  if (sumData.totalActiveQuotations < 5 || sumData.portfolioHealth.critical < 1) {
    throw new Error('Summary does not reflect actual database state!');
  }
  console.log('>>> TEST 12 PASSED: Portfolio summary accurately aggregates live database entities.');

  console.log('\n====================================================');
  console.log('   ALL 12 DEAL HEALTH & ANOMALY TESTS PASSED! ✅');
  console.log('====================================================');
  process.exit(0);
}

runDealHealthTests().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
