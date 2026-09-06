import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuotes, getQuoteById } from '../services/quoteApi';
import { submitAction } from '../services/approvalApi';
import { Button, StatusBadge } from '../components/common/UI';
import { formatMoney, formatPercent, formatDateTime, formatDate } from '../utils/formatters';
import {
  Loader2,
  ArrowLeft,
  Search,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  User,
  ChevronRight
} from 'lucide-react';

export default function Approvals() {
  const { quoteId } = useParams();
  const navigate = useNavigate();

  // Queue state
  const [queue, setQueue] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [filterTab, setFilterTab] = useState('PENDING');
  const [searchQuery, setSearchQuery] = useState('');

  // Single quote review state
  const [quote, setQuote] = useState(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [actionFeedback, setActionFeedback] = useState(null);

  const fetchApprovalsQueue = async () => {
    try {
      setLoadingQueue(true);
      const res = await getQuotes();
      const all = res.data || [];
      setQueue(all);
    } catch (err) {
      console.error('Failed to load approvals queue:', err);
    } finally {
      setLoadingQueue(false);
    }
  };

  useEffect(() => {
    fetchApprovalsQueue();
  }, []);

  useEffect(() => {
    if (!quoteId) {
      setQuote(null);
      return;
    }

    const fetchSingle = async () => {
      try {
        setLoadingQuote(true);
        setQuoteError(null);
        setActionFeedback(null);
        const res = await getQuoteById(quoteId);
        setQuote(res.data);
      } catch (err) {
        setQuoteError(err?.error?.message || err?.message || 'Failed to load quotation for approval review.');
      } finally {
        setLoadingQuote(false);
      }
    };

    fetchSingle();
  }, [quoteId]);

  const handleAction = async (action) => {
    if (!quote) return;
    try {
      setActionLoading(true);
      setActionFeedback(null);
      await submitAction(quote.id, { action, reason });
      setActionFeedback({
        type: 'success',
        text: `Quotation successfully marked as ${action === 'APPROVE' ? 'APPROVED' : action === 'REJECT' ? 'REJECTED' : 'RETURNED FOR REVISION'}.`
      });
      const res = await getQuoteById(quote.id);
      setQuote(res.data);
      setReason('');
      fetchApprovalsQueue();
    } catch (err) {
      setActionFeedback({
        type: 'error',
        text: err?.error?.message || err?.message || 'Approval action failed.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // ── DETAIL VIEW (REVIEW SINGLE QUOTE) ──
  if (quoteId) {
    if (loadingQuote) {
      return (
        <div className="flex items-center justify-center h-full space-x-3 text-zinc-500 font-mono-num text-xs py-20">
          <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
          <span>LOADING GOVERNANCE PACKAGE...</span>
        </div>
      );
    }

    if (quoteError || !quote) {
      return (
        <div className="flex flex-col items-center justify-center h-full space-y-4 py-20">
          <p className="text-rose-400 font-mono-num text-xs uppercase">{quoteError || 'Quotation not found'}</p>
          <Button variant="outline" onClick={() => navigate('/approvals')} className="font-mono-num">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> BACK TO APPROVALS
          </Button>
        </div>
      );
    }

    const riskScore = quote.discountRiskScore || (quote.riskLevel === 'HIGH' ? 85 : quote.riskLevel === 'MEDIUM' ? 45 : 15);
    const riskBadge =
      riskScore > 70
        ? 'text-rose-400 border-rose-500/30 bg-rose-500/10'
        : riskScore > 40
        ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
        : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';

    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex items-baseline justify-between border-b border-[#222222] pb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/approvals')}
              className="p-1.5 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white font-mono-num uppercase">
                {quote.quoteNumber} — {quote.customerName}
              </h1>
              <p className="text-xs text-zinc-500 font-mono-num mt-0.5">
                Rep: {quote.assignedRep || 'Sales Rep'} · Created: {formatDate(quote.created)}
              </p>
            </div>
          </div>
          <StatusBadge status={quote.status} />
        </div>

        {actionFeedback && (
          <div
            className={`p-3 text-xs font-mono-num border rounded-sm flex items-center space-x-2 ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/25 text-rose-300'
            }`}
          >
            {actionFeedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            )}
            <span>{actionFeedback.text}</span>
          </div>
        )}

        {/* Commercial Summary - Subtle Surface */}
        <div className="p-5 bg-[#111111] border border-[#222222] rounded-sm">
          <p className="editorial-label mb-3">COMMERCIAL SUMMARY</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-[11px] text-zinc-500 font-mono-num uppercase">Grand Total</p>
              <p className="text-2xl font-bold text-white font-mono-num mt-1">
                {formatMoney(quote.grandTotal)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-zinc-500 font-mono-num uppercase">Gross Margin</p>
              <p className="text-2xl font-bold text-emerald-400 font-mono-num mt-1">
                {formatPercent(quote.marginPercent || 35)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-zinc-500 font-mono-num uppercase">Discount Given</p>
              <p className="text-2xl font-bold text-rose-400 font-mono-num mt-1">
                {formatMoney(quote.discountTotal)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-zinc-500 font-mono-num uppercase">Line Items</p>
              <p className="text-2xl font-bold text-white font-mono-num mt-1">
                {quote.lines?.length || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Risk Evaluation */}
        <div className="p-5 bg-[#111111] border border-[#222222] rounded-sm flex items-center justify-between">
          <div>
            <p className="editorial-label">DISCOUNT RISK EVALUATION</p>
            <div className="flex items-baseline space-x-3 mt-1.5">
              <span className="text-3xl font-bold font-mono-num text-white">{riskScore}</span>
              <span className="text-xs text-zinc-500 font-mono-num">/ 100 Risk Score</span>
            </div>
          </div>
          <div className="text-right">
            <span className={`px-2.5 py-1 text-xs font-mono-num uppercase font-bold rounded-sm border ${riskBadge}`}>
              {riskScore > 70 ? 'HIGH RISK' : riskScore > 40 ? 'MEDIUM RISK' : 'LOW RISK'}
            </span>
            <p className="text-[11px] text-zinc-500 font-mono-num mt-1.5">
              Requires {quote.approval?.requiredLevel?.replace(/_/g, ' ') || 'SALES MANAGER'} Signoff
            </p>
          </div>
        </div>

        {/* Governance Approval Chain Timeline */}
        <div>
          <p className="editorial-label mb-3">GOVERNANCE AUDIT TRAIL</p>
          <div className="divide-y divide-[#222222] border-y border-[#222222]">
            {(quote.approval?.steps && quote.approval.steps.length > 0) ? (
              quote.approval.steps.map((step, idx) => (
                <div key={idx} className="py-3 flex items-start justify-between text-xs font-mono-num">
                  <div className="space-y-0.5">
                    <p className="text-zinc-200 font-semibold">{step.role?.replace(/_/g, ' ')}</p>
                    {step.reviewer && (
                      <p className="text-zinc-500">Reviewer: {step.reviewer} · {formatDateTime(step.date)}</p>
                    )}
                    {step.reason && (
                      <p className="text-zinc-400 italic mt-1 font-sans">"{step.reason}"</p>
                    )}
                  </div>
                  <StatusBadge status={step.status} />
                </div>
              ))
            ) : (
              <div className="py-3 text-xs text-zinc-500 font-mono-num">
                Sales Manager Review · Pending signoff on pricing exceptions
              </div>
            )}
          </div>
        </div>

        {/* Decision Action Form */}
        <div className="pt-2 space-y-3">
          <p className="editorial-label">EXECUTIVE DECISION</p>
          <textarea
            className="w-full p-3 bg-[#0a0a0a] border border-[#262626] rounded-sm text-xs font-mono-num text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
            placeholder="Add decision notes, conditions, or revision instructions (optional)..."
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex items-center space-x-3 pt-1">
            <Button
              variant="primary"
              className="font-mono-num text-xs px-4"
              onClick={() => handleAction('APPROVE')}
              disabled={actionLoading}
            >
              APPROVE QUOTATION
            </Button>
            <Button
              variant="danger"
              className="font-mono-num text-xs px-4"
              onClick={() => handleAction('REJECT')}
              disabled={actionLoading}
            >
              REJECT
            </Button>
            <Button
              variant="outline"
              className="font-mono-num text-xs px-4"
              onClick={() => handleAction('RETURN')}
              disabled={actionLoading}
            >
              RETURN FOR REVISION
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── QUEUE VIEW (MONOCHROME EDITORIAL LEDGER) ──
  const pendingQuotes = queue.filter(
    (q) =>
      q.status === 'PENDING_APPROVAL' ||
      q.status === 'PENDING_MANAGER_APPROVAL' ||
      q.status === 'PENDING_FINANCE_APPROVAL' ||
      q.approval?.status === 'PENDING' ||
      q.status === 'DRAFT'
  );

  let displayedQuotes = queue;
  if (filterTab === 'PENDING') {
    displayedQuotes = pendingQuotes;
  } else if (filterTab === 'HIGH_RISK') {
    displayedQuotes = queue.filter(
      (q) => q.riskLevel === 'HIGH' || (q.discountRiskScore && q.discountRiskScore > 70)
    );
  } else if (filterTab === 'APPROVED') {
    displayedQuotes = queue.filter((q) => q.status === 'APPROVED');
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    displayedQuotes = displayedQuotes.filter(
      (item) =>
        (item.quoteNumber && item.quoteNumber.toLowerCase().includes(q)) ||
        (item.customerName && item.customerName.toLowerCase().includes(q)) ||
        (item.assignedRep && item.assignedRep.toLowerCase().includes(q))
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header with hairline border */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-[#222222] pb-4 gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white uppercase font-mono-num">
            GOVERNANCE APPROVALS
          </h1>
          <p className="text-xs text-zinc-500 font-mono-num mt-0.5">
            Pricing discount exceptions & executive governance ledger
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-xs font-mono-num text-zinc-400">
            {pendingQuotes.length} PENDING REVIEW
          </span>
          <Button variant="outline" onClick={fetchApprovalsQueue} disabled={loadingQueue} className="font-mono-num">
            REFRESH
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Search Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222222] pb-3">
        <div className="flex items-center space-x-4 text-xs font-mono-num">
          <button
            onClick={() => setFilterTab('PENDING')}
            className={`pb-1 transition-colors ${
              filterTab === 'PENDING'
                ? 'text-white border-b-2 border-white font-bold'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            PENDING ({pendingQuotes.length})
          </button>
          <button
            onClick={() => setFilterTab('HIGH_RISK')}
            className={`pb-1 transition-colors ${
              filterTab === 'HIGH_RISK'
                ? 'text-white border-b-2 border-white font-bold'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            HIGH RISK
          </button>
          <button
            onClick={() => setFilterTab('APPROVED')}
            className={`pb-1 transition-colors ${
              filterTab === 'APPROVED'
                ? 'text-white border-b-2 border-white font-bold'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            APPROVED
          </button>
          <button
            onClick={() => setFilterTab('ALL')}
            className={`pb-1 transition-colors ${
              filterTab === 'ALL'
                ? 'text-white border-b-2 border-white font-bold'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            ALL ({queue.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            className="w-full bg-[#111111] border border-[#222222] rounded-sm pl-8 pr-3 py-1.5 text-xs font-mono-num text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            placeholder="Search quote or client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Flat Editorial Table / Rows - No bloated cards */}
      {loadingQueue ? (
        <div className="flex items-center justify-center py-20 space-x-3 text-zinc-500 font-mono-num text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
          <span>LOADING APPROVALS...</span>
        </div>
      ) : displayedQuotes.length === 0 ? (
        <div className="py-16 text-center text-zinc-500 font-mono-num text-xs border-y border-[#222222]">
          NO QUOTATIONS FOUND MATCHING CRITERIA
        </div>
      ) : (
        <div className="divide-y divide-[#222222] border-y border-[#222222]">
          {displayedQuotes.map((item) => {
            const isHigh = item.riskLevel === 'HIGH' || (item.discountRiskScore && item.discountRiskScore > 70);
            const isMed = item.riskLevel === 'MEDIUM' || (item.discountRiskScore && item.discountRiskScore > 40 && item.discountRiskScore <= 70);

            return (
              <div
                key={item.id}
                onClick={() => navigate(`/approvals/${item.id}`)}
                className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#111111] transition-colors cursor-pointer group"
              >
                <div className="flex items-baseline space-x-4">
                  <span className="font-mono-num font-bold text-xs text-white tracking-wide">
                    {item.quoteNumber}
                  </span>
                  <span className="font-mono-num text-xs text-zinc-300">
                    {item.customerName}
                  </span>
                  {item.customerTier && (
                    <span className="text-[10px] text-zinc-500 font-mono-num uppercase">
                      ({item.customerTier})
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-6 text-xs font-mono-num">
                  <span className="text-white font-bold">
                    {formatMoney(item.grandTotal)}
                  </span>

                  <span className={`text-[11px] font-semibold ${
                    isHigh ? 'text-rose-400' : isMed ? 'text-amber-400' : 'text-zinc-500'
                  }`}>
                    {isHigh ? 'HIGH RISK' : isMed ? 'MEDIUM' : 'LOW'}
                  </span>

                  <StatusBadge status={item.status} />

                  <span className="text-zinc-500 group-hover:text-white transition-colors">
                    →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
