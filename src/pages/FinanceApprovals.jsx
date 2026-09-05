import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge } from '../components/common/UI';
import { formatMoney, formatDate } from '../utils/formatters';
import { AlertTriangle, CheckCircle, XCircle, RotateCcw, Loader2, ShieldAlert, ChevronRight } from 'lucide-react';
import { getQuoteApproval as getApproval, submitAction as takeApprovalAction } from '../services/approvalApi';

// Mock finance approval queue data
const MOCK_FINANCE_QUEUE = [
  {
    id: 'q1',
    quoteNumber: 'Q-1001',
    customer: 'Acme Corp',
    rep: 'Sarah Sales',
    grandTotal: 197400,
    discountPercent: 18,
    marginPercent: 14.2,
    discountRiskScore: 82,
    reason: 'Discount exceeds 15% threshold — Finance sign-off required',
    submitted: '2026-09-04T09:30:00Z',
    lines: [
      { productName: 'Laptop', quantity: 2, unitPrice: 100000, discountPercent: 18, lineTotal: 164000 },
      { productName: 'Setup Service', quantity: 1, unitPrice: 20000, discountPercent: 18, lineTotal: 16400 },
      { productName: 'Cloud Pro', quantity: 1, unitPrice: 6000, discountPercent: 18, lineTotal: 4920 },
    ],
    approvalChain: [
      { level: 'Sales Manager', approver: 'Michael Manager', status: 'APPROVED', date: '2026-09-04T11:00:00Z' },
      { level: 'Finance', approver: 'Pending', status: 'PENDING', date: null },
    ],
  },
  {
    id: 'q2',
    quoteNumber: 'Q-0995',
    customer: 'Beta Industries',
    rep: 'Sarah Sales',
    grandTotal: 450000,
    discountPercent: 22,
    marginPercent: 9.1,
    discountRiskScore: 91,
    reason: 'High-value deal >₹4L + discount >20% — Finance mandatory',
    submitted: '2026-09-03T14:00:00Z',
    lines: [
      { productName: 'Laptop', quantity: 8, unitPrice: 100000, discountPercent: 22, lineTotal: 624000 },
    ],
    approvalChain: [
      { level: 'Sales Manager', approver: 'Michael Manager', status: 'APPROVED', date: '2026-09-03T16:00:00Z' },
      { level: 'Finance', approver: 'Pending', status: 'PENDING', date: null },
    ],
  },
];

function RiskBadge({ score }) {
  if (score >= 80) return <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{score} High Risk</span>;
  if (score >= 50) return <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{score} Medium</span>;
  return <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{score} Low</span>;
}

function QuoteDetail({ quote, onClose }) {
  const [action, setAction] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleAction = async (act) => {
    if (act !== 'APPROVE' && !reason.trim()) {
      alert('Please provide a reason for rejection/return.');
      return;
    }
    try {
      setSubmitting(true);
      await takeApprovalAction(quote.id, act, reason);
      setDone(true);
      setTimeout(() => onClose(true), 1500);
    } catch (e) {
      alert('Action failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 text-center shadow-xl">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="font-semibold text-gray-900 text-lg">Action Recorded</p>
          <p className="text-gray-500 text-sm mt-1">The quote has been updated.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{quote.quoteNumber} — Finance Approval</h2>
            <p className="text-sm text-gray-500">{quote.customer} · Submitted {formatDate(quote.submitted)}</p>
          </div>
          <button onClick={() => onClose(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Risk Banner */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700 text-sm">Finance Review Required</p>
              <p className="text-red-600 text-xs mt-0.5">{quote.reason}</p>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Grand Total</p>
              <p className="font-bold text-gray-900 text-base mt-0.5">{formatMoney(quote.grandTotal)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Discount</p>
              <p className="font-bold text-amber-600 text-base mt-0.5">{quote.discountPercent}%</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Margin</p>
              <p className={`font-bold text-base mt-0.5 ${quote.marginPercent < 12 ? 'text-red-600' : 'text-green-700'}`}>
                {quote.marginPercent}%
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Risk Score</p>
              <div className="mt-0.5"><RiskBadge score={quote.discountRiskScore} /></div>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Quote Lines</p>
            <table className="w-full text-sm border border-gray-100 rounded-lg overflow-hidden">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Product</th>
                  <th className="px-4 py-2 text-center">Qty</th>
                  <th className="px-4 py-2 text-right">Unit Price</th>
                  <th className="px-4 py-2 text-center">Disc %</th>
                  <th className="px-4 py-2 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {quote.lines.map((ln, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-4 py-2 font-medium text-gray-900">{ln.productName}</td>
                    <td className="px-4 py-2 text-center">{ln.quantity}</td>
                    <td className="px-4 py-2 text-right">{formatMoney(ln.unitPrice)}</td>
                    <td className="px-4 py-2 text-center text-amber-600 font-semibold">{ln.discountPercent}%</td>
                    <td className="px-4 py-2 text-right font-semibold">{formatMoney(ln.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Approval Chain */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Approval Chain</p>
            <div className="space-y-2">
              {quote.approvalChain.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  {step.status === 'APPROVED'
                    ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    : <div className="w-4 h-4 rounded-full border-2 border-amber-400 flex-shrink-0" />}
                  <span className="text-sm font-medium text-gray-700">{step.level}</span>
                  <span className="text-xs text-gray-500">{step.approver}</span>
                  {step.date && <span className="text-xs text-gray-400 ml-auto">{formatDate(step.date)}</span>}
                  {step.status === 'APPROVED' && <span className="text-xs text-green-600 font-semibold">Approved</span>}
                  {step.status === 'PENDING' && <span className="text-xs text-amber-600 font-semibold ml-auto">Awaiting</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Reason input for Reject/Return */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
              Reason <span className="text-gray-400 font-normal">(required for Reject / Return)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Provide justification..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => handleAction('APPROVE')}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Approve
            </button>
            <button
              onClick={() => handleAction('REJECT')}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg font-semibold text-sm hover:bg-red-700 disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" /> Reject
            </button>
            <button
              onClick={() => handleAction('RETURN')}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 border border-amber-400 text-amber-700 rounded-lg font-semibold text-sm hover:bg-amber-50 disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" /> Return for Revision
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FinanceApprovals() {
  const [queue, setQueue] = useState(MOCK_FINANCE_QUEUE);
  const [selected, setSelected] = useState(null);

  const handleClose = (acted) => {
    if (acted && selected) {
      setQueue(q => q.filter(x => x.id !== selected.id));
    }
    setSelected(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance Approval Queue</h1>
          <p className="text-sm text-gray-500 mt-1">Second-level approvals requiring Finance sign-off</p>
        </div>
        <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full">
          {queue.length} Pending
        </span>
      </div>

      {queue.length === 0 && (
        <Card className="p-16 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="font-semibold text-gray-900">All clear!</p>
          <p className="text-sm text-gray-500 mt-1">No pending Finance approvals.</p>
        </Card>
      )}

      <div className="space-y-4">
        {queue.map((item) => (
          <Card key={item.id} className="p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelected(item)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ShieldAlert className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{item.quoteNumber}</span>
                    <RiskBadge score={item.discountRiskScore} />
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{item.customer} · Rep: {item.rep}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.reason}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-right">
                <div>
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="font-bold text-gray-900">{formatMoney(item.grandTotal)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Discount</p>
                  <p className="font-bold text-amber-600">{item.discountPercent}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Margin</p>
                  <p className={`font-bold ${item.marginPercent < 12 ? 'text-red-600' : 'text-green-700'}`}>{item.marginPercent}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Submitted</p>
                  <p className="text-sm text-gray-700">{formatDate(item.submitted)}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {selected && <QuoteDetail quote={selected} onClose={handleClose} />}
    </div>
  );
}
