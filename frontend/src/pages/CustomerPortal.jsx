import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getQuote, submitNegotiation, confirmQuote } from '../services/portalApi';
import { formatMoney, formatDate } from '../utils/formatters';
import { Card, Button, Badge } from '../components/common/UI';
import { CheckCircle, MessageSquare, Send, AlertCircle, Loader2 } from 'lucide-react';

export default function CustomerPortal() {
  const { token } = useParams();

  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [negotiationMode, setNegotiationMode] = useState(false);

  // Negotiation form state
  const [lineComments, setLineComments] = useState({});
  const [changeRequest, setChangeRequest] = useState('');
  const [counterDiscount, setCounterDiscount] = useState('');

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getQuote(token);
        setQuote(res.data);
      } catch (err) {
        setError(err?.error?.message || 'Failed to load quotation. Please check your link.');
      } finally {
        setLoading(false);
      }
    };
    fetchQuote();
  }, [token]);

  const handleLineComment = (lineId, comment) => {
    setLineComments({ ...lineComments, [lineId]: comment });
  };

  const handleSubmitNegotiation = async () => {
    try {
      setSubmitting(true);
      const payload = {
        lineComments,
        changeRequest,
        counterDiscount: counterDiscount ? Number(counterDiscount) : undefined,
      };
      const res = await submitNegotiation(token, payload);
      setSuccessMsg(res.data.message);
      setNegotiationMode(false);
      setLineComments({});
      setChangeRequest('');
      setCounterDiscount('');
      if (res.data.newStatus) {
        setQuote((prev) => ({ ...prev, status: res.data.newStatus }));
      }
      if (res.data.approvalRequired) {
        setSuccessMsg(res.data.message + ' Quotation requires governance approval.');
      }
    } catch (err) {
      alert(err?.error?.message || err?.message || 'Negotiation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    try {
      setConfirming(true);
      const targetId = quote?.id || token;
      const res = await confirmQuote(targetId);
      setSuccessMsg(res.data?.message || res.message || 'Quotation confirmed successfully!');
      setQuote((prev) => ({
        ...prev,
        status: 'Confirmed',
        internalStatus: 'CUSTOMER_CONFIRMED',
      }));
    } catch (err) {
      alert(err?.error?.message || err?.message || 'Confirmation failed.');
    } finally {
      setConfirming(false);
    }
  };

  const getStatusStyle = (status) => {
    const s = status?.toUpperCase();
    if (s === 'CONFIRMED') return 'success';
    if (s === 'UNDER_NEGOTIATION') return 'warning';
    if (s === 'SENT' || s === 'APPROVED') return 'primary';
    return 'default';
  };

  const formatStatus = (s) => s?.replace(/_/g, ' ').replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase());

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-[var(--c-muted)] space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--c-muted)] mb-2" />
        <p className="text-xs font-mono">Retrieving verified quotation agreement...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto">
        <AlertCircle className="w-10 h-10 text-[var(--c-danger)] mb-4" />
        <p className="text-[var(--c-danger)] font-semibold text-sm mb-1">Unable to Load Quotation</p>
        <p className="text-[var(--c-muted)] text-xs font-mono">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="w-12 h-12 rounded-full border border-[var(--c-rule)] bg-[var(--c-surface)] flex items-center justify-center mx-auto mb-4 text-[var(--c-muted)]">
          <MessageSquare className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-mono text-[var(--c-subtle)] uppercase tracking-wider block mb-1">
          Client Portal / Account Active
        </span>
        <h2 className="text-xl font-semibold tracking-tight text-[var(--c-fg)] mb-2">
          No Commercial Quotations Issued Yet
        </h2>
        <p className="text-xs text-[var(--c-muted)] leading-relaxed mb-6 max-w-md mx-auto">
          Welcome to your DealFlow360 Partner Portal. Your assigned sales representative has not yet published an approved quotation for your organization. Once sent, your proposals will appear here for review and negotiation.
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={() => window.location.reload()} className="text-xs">
            Refresh Status
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              localStorage.removeItem('dealflow_customer_token');
              localStorage.removeItem('dealflow_customer_id');
              window.location.href = '/customer/login';
            }}
            className="text-xs"
          >
            Switch Account
          </Button>
        </div>
      </div>
    );
  }

  const allQuotes = quote.allQuotes || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* MULTIPLE QUOTES SWITCHER */}
      {allQuotes.length > 1 && (
        <div className="bg-[var(--c-surface)] border border-[var(--c-rule)] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-[var(--c-subtle)] uppercase tracking-wider">Available Proposals ({allQuotes.length}):</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {allQuotes.map((q) => (
              <a
                key={q.id}
                href={`/customer/quotes/${q.id}`}
                className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
                  q.id === quote.id
                    ? 'border-[var(--c-fg)] bg-[var(--c-fg)] text-[var(--c-bg)] font-semibold'
                    : 'border-[var(--c-rule)] text-[var(--c-muted)] hover:border-[var(--c-fg)] hover:text-[var(--c-fg)]'
                }`}
              >
                {q.id.substring(0, 8).toUpperCase()} &bull; {q.status}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* SUCCESS BANNER */}
      {successMsg && (
        <div className="flex items-center bg-[var(--c-success-bg)] border border-[var(--c-success-border)] text-[var(--c-success)] rounded-lg p-3.5">
          <CheckCircle className="w-4 h-4 mr-2.5 flex-shrink-0" />
          <p className="text-xs font-mono">{successMsg}</p>
          <button onClick={() => setSuccessMsg('')} className="ml-auto text-[var(--c-success)] text-sm">&times;</button>
        </div>
      )}

      {/* QUOTE HEADER */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-mono text-[var(--c-subtle)] uppercase tracking-wider block mb-1">
              Commercial Agreement / Verified
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-[var(--c-fg)] font-mono">{quote.quoteNumber}</h1>
            <p className="text-xs text-[var(--c-muted)] mt-1">
              Prepared for <span className="font-medium text-[var(--c-fg)]">{quote.customerName}</span>
            </p>
            <p className="text-[11px] font-mono text-[var(--c-subtle)] mt-0.5">Created: {formatDate(quote.created)}</p>
          </div>
          <Badge variant={getStatusStyle(quote.status)}>
            {formatStatus(quote.status)}
          </Badge>
        </div>
      </Card>

      {/* PRODUCT TABLE */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3 df-card-header">
          <h2 className="font-semibold text-[var(--c-fg)] text-xs uppercase font-mono tracking-wider">
            Products & Commercial Services
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="df-table-head">
              <tr>
                <th className="px-5 py-3 text-left font-mono font-medium text-[var(--c-subtle)] uppercase tracking-wider">Product</th>
                <th className="px-5 py-3 text-center font-mono font-medium text-[var(--c-subtle)] uppercase tracking-wider">Qty</th>
                <th className="px-5 py-3 text-right font-mono font-medium text-[var(--c-subtle)] uppercase tracking-wider">Unit Price</th>
                <th className="px-5 py-3 text-right font-mono font-medium text-[var(--c-subtle)] uppercase tracking-wider">Discount</th>
                <th className="px-5 py-3 text-right font-mono font-medium text-[var(--c-subtle)] uppercase tracking-wider">Total</th>
                {negotiationMode && <th className="px-5 py-3 text-left font-mono font-medium text-[var(--c-subtle)] uppercase tracking-wider">Comment</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--c-rule)]">
              {quote.lines?.map((line) => (
                <tr key={line.id} className="df-table-row">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-[var(--c-fg)]">{line.productName}</p>
                    <p className="text-[10px] font-mono text-[var(--c-subtle)] mt-0.5">{line.type?.replace(/_/g, ' ')}</p>
                  </td>
                  <td className="px-5 py-3.5 text-center font-mono text-[var(--c-muted)]">{line.quantity}</td>
                  <td className="px-5 py-3.5 text-right font-mono text-[var(--c-muted)]">{formatMoney(line.unitPrice)}</td>
                  <td className="px-5 py-3.5 text-right font-mono text-[var(--c-danger)]">{line.discountPercent}%</td>
                  <td className="px-5 py-3.5 text-right font-mono font-medium text-[var(--c-fg)]">{formatMoney(line.lineTotal)}</td>
                  {negotiationMode && (
                    <td className="px-5 py-3.5">
                      <input
                        type="text"
                        placeholder="Add item feedback..."
                        value={lineComments[line.id] || ''}
                        onChange={(e) => handleLineComment(line.id, e.target.value)}
                        className="df-input w-full px-2.5 py-1 text-xs"
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TOTALS */}
        <div className="border-t border-[var(--c-rule)] bg-[var(--c-surface)] px-6 py-4">
          <div className="flex justify-end">
            <div className="w-72 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-[var(--c-muted)]">
                <span>Subtotal</span>
                <span className="text-[var(--c-fg)]">{formatMoney(quote.subtotal)}</span>
              </div>
              <div className="flex justify-between text-[var(--c-muted)]">
                <span>Total Discount</span>
                <span className="text-[var(--c-danger)]">-{formatMoney(quote.discountTotal)}</span>
              </div>
              <div className="flex justify-between text-[var(--c-muted)] border-b border-[var(--c-rule)] pb-2">
                <span>Applicable Tax</span>
                <span className="text-[var(--c-fg)]">{formatMoney(quote.taxTotal)}</span>
              </div>
              <div className="flex justify-between pt-1 text-sm font-semibold">
                <span className="text-[var(--c-fg)] uppercase tracking-wider">Grand Total</span>
                <span className="text-[var(--c-fg)] font-bold">{formatMoney(quote.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* NEGOTIATION FORM */}
      {negotiationMode && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[var(--c-rule)]">
            <MessageSquare className="w-4 h-4 text-[var(--c-muted)]" />
            <h2 className="font-semibold text-[var(--c-fg)] text-xs uppercase font-mono tracking-wider">
              Submit Commercial Change Request
            </h2>
          </div>
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--c-subtle)] mb-1.5">General Request Notes</label>
            <textarea
              className="df-input w-full p-3 text-xs resize-none"
              placeholder="Describe commercial modifications, requested volumes, or delivery terms..."
              rows={3}
              value={changeRequest}
              onChange={(e) => setChangeRequest(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--c-subtle)] mb-1.5">Counter Discount (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="e.g. 15"
              value={counterDiscount}
              onChange={(e) => setCounterDiscount(e.target.value)}
              className="df-input w-40 p-2 text-xs font-mono"
            />
          </div>
          <div className="flex items-center space-x-3 pt-2">
            <Button
              variant="primary"
              onClick={handleSubmitNegotiation}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Submit Request
            </Button>
            <Button
              variant="ghost"
              onClick={() => setNegotiationMode(false)}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* ACTIONS */}
      {!negotiationMode && (() => {
        const isConfirmedOrBeyond =
          quote.internalStatus === 'CUSTOMER_CONFIRMED' ||
          ['ORDER_CREATED', 'FULFILLMENT', 'PARTIALLY_FULFILLED', 'FULFILLED', 'INVOICED', 'PAID'].includes(quote.internalStatus) ||
          String(quote.status).toLowerCase().includes('confirm') ||
          String(quote.status).toLowerCase().includes('paid');

        return (
          <div className="flex items-center space-x-4 pt-2">
            {!isConfirmedOrBeyond && (
              <Button
                variant="outline"
                onClick={() => setNegotiationMode(true)}
              >
                <MessageSquare className="w-4 h-4 mr-2 text-[var(--c-muted)]" />
                Request Changes
              </Button>
            )}
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={confirming || isConfirmedOrBeyond}
            >
              {confirming ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              {isConfirmedOrBeyond ? 'Agreement Confirmed' : 'Confirm & Accept Quotation'}
            </Button>
          </div>
        );
      })()}
    </div>
  );
}
