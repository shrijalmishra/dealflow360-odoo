import React, { useState, useEffect } from 'react';
import { Button } from '../components/common/UI';
import { formatMoney, formatDate } from '../utils/formatters';
import {
  CheckCircle,
  XCircle,
  RotateCcw,
  Loader2,
  RefreshCw,
  AlertTriangle,
  X
} from 'lucide-react';
import { getApprovals, submitAction as takeApprovalAction } from '../services/approvalApi';
import { getQuoteById } from '../services/quoteApi';

function RiskBadge({ score, level }) {
  if (level === 'HIGH' || score >= 70) {
    return (
      <span className="text-[11px] font-mono-num font-bold text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-sm">
        {score ? `${score} HIGH RISK` : 'HIGH RISK'}
      </span>
    );
  }
  if (level === 'MEDIUM' || score >= 40) {
    return (
      <span className="text-[11px] font-mono-num font-bold text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-sm">
        {score ? `${score} MEDIUM` : 'MEDIUM RISK'}
      </span>
    );
  }
  return (
    <span className="text-[11px] font-mono-num font-bold text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-sm">
      {score ? `${score} LOW` : 'LOW RISK'}
    </span>
  );
}

function QuoteDetail({ quoteId, onClose }) {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadQuote() {
      try {
        setLoading(true);
        const res = await getQuoteById(quoteId);
        setQuote(res.data || res);
      } catch (e) {
        setError('Failed to fetch quotation governance details.');
      } finally {
        setLoading(false);
      }
    }
    loadQuote();
  }, [quoteId]);

  const handleAction = async (act) => {
    if (act !== 'APPROVE' && !reason.trim()) {
      alert('Please provide a reason for rejection or return.');
      return;
    }
    try {
      setSubmitting(true);
      await takeApprovalAction(quoteId, act, reason);
      setDone(true);
      setTimeout(() => onClose(true), 1000);
    } catch (e) {
      alert(e?.error?.message || e?.message || 'Action failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#111111] border border-[#2a2a2a] rounded-sm w-full max-w-2xl overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222222]">
          <div>
            <h2 className="text-sm font-bold text-white uppercase font-mono-num">
              FINANCE REVIEW — {quote?.quoteNumber || quoteId}
            </h2>
            <p className="text-xs text-zinc-500 font-mono-num mt-0.5">
              Customer: <span className="text-zinc-300">{quote?.customerName || quote?.customer?.name || 'Client'}</span>
            </p>
          </div>
          <button onClick={() => onClose(false)} className="text-zinc-500 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-20 flex items-center justify-center space-x-3 text-zinc-500 font-mono-num text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
            <span>FETCHING GOVERNANCE PACKAGE...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 font-mono-num text-xs">
            {error}
          </div>
        ) : done ? (
          <div className="py-16 text-center space-y-2">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-sm font-bold text-white font-mono-num">DECISION RECORDED</p>
          </div>
        ) : (
          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Commercial Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[#0a0a0a] border border-[#222222] rounded-sm font-mono-num">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase">Gross Total</p>
                <p className="text-sm font-bold text-white mt-0.5">{formatMoney(quote.subtotal || quote.grossTotal)}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase">Discount</p>
                <p className="text-sm font-bold text-rose-400 mt-0.5">-{formatMoney(quote.discountTotal || 0)}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase">Net Payable</p>
                <p className="text-sm font-bold text-white mt-0.5">{formatMoney(quote.grandTotal || quote.netTotal)}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase">Risk Level</p>
                <div className="mt-0.5">
                  <RiskBadge score={quote.discountRiskScore} level={quote.riskLevel} />
                </div>
              </div>
            </div>

            {/* Line items table */}
            {quote.lines && quote.lines.length > 0 && (
              <div className="space-y-2">
                <p className="editorial-label">PROPOSED LINE ITEMS</p>
                <div className="border border-[#222222] rounded-sm overflow-hidden">
                  <table className="w-full text-xs font-mono-num text-left">
                    <thead className="bg-[#0a0a0a] text-zinc-500 uppercase border-b border-[#222222]">
                      <tr>
                        <th className="px-3 py-2">PRODUCT</th>
                        <th className="px-3 py-2 text-center">QTY</th>
                        <th className="px-3 py-2 text-right">UNIT</th>
                        <th className="px-3 py-2 text-right">DISC%</th>
                        <th className="px-3 py-2 text-right">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f1f1f]">
                      {quote.lines.map((l, idx) => (
                        <tr key={idx} className="hover:bg-[#161616]">
                          <td className="px-3 py-2 text-zinc-200">{l.productName}</td>
                          <td className="px-3 py-2 text-center text-zinc-400">{l.quantity}</td>
                          <td className="px-3 py-2 text-right text-zinc-300">{formatMoney(l.unitPrice)}</td>
                          <td className="px-3 py-2 text-right text-rose-400">{l.discountPercent}%</td>
                          <td className="px-3 py-2 text-right text-white font-bold">{formatMoney(l.lineTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Decision Notes */}
            <div className="space-y-2">
              <p className="editorial-label">DECISION REASONING</p>
              <textarea
                className="w-full p-3 bg-[#0a0a0a] border border-[#262626] rounded-sm text-xs font-mono-num text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
                placeholder="Required for Rejection or Return (optional for Approval)..."
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2 border-t border-[#222222]">
              <Button
                variant="outline"
                className="font-mono-num text-xs"
                onClick={() => onClose(false)}
                disabled={submitting}
              >
                CANCEL
              </Button>
              <Button
                variant="danger"
                className="font-mono-num text-xs"
                onClick={() => handleAction('REJECT')}
                disabled={submitting}
              >
                REJECT
              </Button>
              <Button
                variant="secondary"
                className="font-mono-num text-xs"
                onClick={() => handleAction('RETURN')}
                disabled={submitting}
              >
                RETURN
              </Button>
              <Button
                variant="primary"
                className="font-mono-num text-xs"
                onClick={() => handleAction('APPROVE')}
                disabled={submitting}
              >
                {submitting ? 'RECORDING...' : 'APPROVE'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FinanceApprovals() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getApprovals();
      const list = res.quotations || res.data || [];
      setQueue(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.message || 'Failed to load finance approval queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleClose = (acted) => {
    if (acted && selectedId) {
      setQueue((q) => q.filter((x) => x.id !== selectedId));
    }
    setSelectedId(null);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-[#222222] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white uppercase font-mono-num">
            FINANCE APPROVAL QUEUE
          </h1>
          <p className="text-xs text-zinc-500 font-mono-num mt-0.5">
            Multi-tier risk governance requiring finance sign-off on pricing exceptions
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-xs font-mono-num text-zinc-400">
            {queue.length} PENDING
          </span>
          <Button variant="outline" onClick={fetchQueue} disabled={loading} className="font-mono-num text-xs">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> REFRESH
          </Button>
        </div>
      </div>

      {/* Queue Table */}
      {loading ? (
        <div className="py-20 flex items-center justify-center space-x-3 text-zinc-500 font-mono-num text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
          <span>LOADING FINANCE QUEUE...</span>
        </div>
      ) : error ? (
        <div className="py-16 text-center text-rose-400 font-mono-num text-xs border-y border-[#222222]">
          {error}
        </div>
      ) : queue.length === 0 ? (
        <div className="py-16 text-center text-zinc-500 font-mono-num text-xs border-y border-[#222222]">
          NO QUOTATIONS CURRENTLY REQUIRING FINANCE SIGN-OFF
        </div>
      ) : (
        <div className="overflow-x-auto border-y border-[#222222]">
          <table className="w-full text-xs font-mono-num">
            <thead>
              <tr className="border-b border-[#222222] text-zinc-500">
                <th className="py-2.5 px-4 text-left font-semibold">QUOTE #</th>
                <th className="py-2.5 px-4 text-left font-semibold">CUSTOMER</th>
                <th className="py-2.5 px-4 text-right font-semibold">NET VALUE</th>
                <th className="py-2.5 px-4 text-center font-semibold">RISK LEVEL</th>
                <th className="py-2.5 px-4 text-left font-semibold">DATE</th>
                <th className="py-2.5 px-4 text-right font-semibold">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f]">
              {queue.map((q) => (
                <tr
                  key={q.id}
                  className="hover:bg-[#111111] transition-colors cursor-pointer group"
                  onClick={() => setSelectedId(q.id)}
                >
                  <td className="py-3 px-4 font-bold text-white tracking-wide">
                    {q.quoteNumber || `QT-${q.id.substring(0, 8).toUpperCase()}`}
                  </td>
                  <td className="py-3 px-4 text-zinc-200">
                    {q.customerName || 'Enterprise Client'}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-white">
                    {formatMoney(q.netTotal || q.grossTotal || 0)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <RiskBadge score={q.discountRiskScore} level={q.riskLevel} />
                  </td>
                  <td className="py-3 px-4 text-zinc-500">
                    {formatDate(q.createdAt)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(q.id);
                      }}
                      className="px-2.5 py-1 text-[11px] font-mono-num bg-white text-black font-semibold rounded-sm hover:bg-zinc-200 transition-colors"
                    >
                      REVIEW →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedId && <QuoteDetail quoteId={selectedId} onClose={handleClose} />}
    </div>
  );
}
