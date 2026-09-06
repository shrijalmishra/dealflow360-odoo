const prisma = require('../src/config/db');

async function inspectQuote() {
  const q = await prisma.quotation.findUnique({
    where: { id: '4f6dd834-d6da-4d98-a54a-a27113925896' },
    include: {
      versions: {
        orderBy: { versionNumber: 'asc' },
        include: {
          lines: { include: { product: true } },
          riskAssessment: true,
          approvalRequest: { include: { decisions: true } },
        },
      },
      negotiationEvents: { orderBy: { createdAt: 'asc' } },
    },
  });

  console.log('Quotation Status:', q.status);
  console.log('Versions count:', q.versions.length);
  q.versions.forEach((v) => {
    console.log(`\nVersion ${v.versionNumber}:`);
    console.log('  Lines count:', v.lines.length);
    v.lines.forEach((l) => {
      console.log(`    - ${l.product.name} qty:${l.quantity} price:${l.unitPrice} discount:${l.discountPct}% allowed:${l.allowedDiscountPct}%`);
    });
    console.log('  Risk Assessment:', v.riskAssessment ? {
      riskLevel: v.riskAssessment.riskLevel,
      blendedScore: v.riskAssessment.blendedScore,
      worstLineExcessPct: v.riskAssessment.worstLineExcessPct,
      totalExcessValue: v.riskAssessment.totalExcessValue,
    } : 'None');
    console.log('  Approval Request:', v.approvalRequest ? {
      status: v.approvalRequest.status,
      currentStep: v.approvalRequest.currentStep,
      decisions: v.approvalRequest.decisions.map((d) => ({
        step: d.step,
        decision: d.decision,
        reason: d.reason,
      })),
    } : 'None');
  });

  console.log(`\nNegotiation Events (${q.negotiationEvents.length}):`);
  q.negotiationEvents.forEach((e, idx) => {
    console.log(`  ${idx + 1}. [${e.type}] by ${e.actor} at ${e.createdAt.toISOString()}`);
    console.log('     Payload:', JSON.stringify(e.payload));
  });
  process.exit(0);
}

inspectQuote().catch((err) => {
  console.error(err);
  process.exit(1);
});
