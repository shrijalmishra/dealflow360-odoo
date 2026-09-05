import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuoteById } from '../services/quoteApi';
import { submitAction } from '../services/approvalApi';
import { Card, Button, Badge, StatusBadge } from '../components/common/UI';
import { formatMoney, formatPercent, formatDateTime } from '../utils/formatters';
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle, XCircle, RotateCcw, User } from 'lucide-react';

export default function Approvals() {
  const { quoteId } = useParams();
  const navigate = useNavigate();

  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        setLoading(true);
        setError(null);
        const qId = quoteId || 'q1';
        const res = await getQuoteById(qId);
        setQuote(res.data);
      } catch (err) {
        setError(err?.error?.message || 'Failed to load approval details.');
      } finally {
        setLoading(false);
      }
    };
    fetchQuote();
  }, [quoteId]);

  const handleAction = async (action) => {
    try {
      setActionLoading(true);
      await submitAction(quote.id, { action, reason });
      // Refresh quote after action
      const res = await getQuoteById(quote.id);
      setQuote(res.data);
      setReason('');
    } catch (err) {
      console.error('Approval action failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading approval details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <p className="text-red-500">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (!quote) return null;

  const riskColor = quote.discountRiskScore > 70 ? 'text-red-600' : quote.discountRiskScore > 40 ? 'text-amber-600' : 'text-green-600';
  const riskBg = quote.discountRiskScore > 70 ? 'bg-red-50 border-red-200' : quote.discountRiskScore > 40 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approval Review</h1>
          <p className="text-sm text-gray-500 mt-1">
            {quote.quoteNumber} — {quote.customerName}
          </p>
        </div>
        <StatusBadge status={quote.status} />
      </div>

      {/* QUOTE SUMMARY */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold uppercase text-gray-500 mb-4">Quote Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-gray-500">Grand Total</p>
            <p className="text-xl font-bold text-gray-900">{formatMoney(quote.grandTotal)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Margin</p>
            <p className="text-xl font-bold text-green-700">{formatPercent(quote.marginPercent)}</p>
            <p className="text-xs text-gray-500">{formatMoney(quote.marginAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Discount</p>
            <p className="text-xl font-bold text-red-600">{formatMoney(quote.discountTotal)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Line Items</p>
            <p className="text-xl font-bold text-gray-900">{quote.lines.length}</p>
          </div>
        </div>
      </Card>

      {/* RISK SCORE */}
      <Card className={`p-6 border ${riskBg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {quote.discountRiskScore > 70 ? (
              <ShieldAlert className="w-10 h-10 text-red-500" />
            ) : (
              <ShieldCheck className="w-10 h-10 text-green-500" />
            )}
            <div>
              <h2 className="text-sm font-semibold uppercase text-gray-700">Discount Risk Score</h2>
              <p className={`text-4xl font-bold ${riskColor}`}>
                {quote.discountRiskScore} <span className="text-lg font-normal text-gray-400">/ 100</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Required Approval Level</p>
            <p className="text-lg font-bold text-gray-900">
              {quote.approval.requiredLevel.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      </Card>

      {/* APPROVAL CHAIN / TIMELINE */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold uppercase text-gray-500 mb-4">Approval Chain</h2>
        <div className="space-y-4">
          {quote.approval.steps.map((step, idx) => (
            <div key={idx} className="flex items-start space-x-4 p-4 border border-gray-100 rounded-lg bg-gray-50/50">
              <div className="flex-shrink-0 mt-0.5">
                {step.status === 'APPROVED' && <CheckCircle className="w-6 h-6 text-green-500" />}
                {step.status === 'REJECTED' && <XCircle className="w-6 h-6 text-red-500" />}
                {step.status === 'RETURNED' && <RotateCcw className="w-6 h-6 text-amber-500" />}
                {step.status === 'PENDING' && <AlertTriangle className="w-6 h-6 text-amber-400" />}
                {step.status === 'NOT_REQUIRED' && <CheckCircle className="w-6 h-6 text-gray-300" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-gray-900">
                    {step.role.replace(/_/g, ' ')}
                  </p>
                  <StatusBadge status={step.status} />
                </div>
                {step.reviewer && (
                  <div className="flex items-center text-sm text-gray-500 space-x-2 mt-1">
                    <User className="w-3.5 h-3.5" />
                    <span>{step.reviewer}</span>
                    {step.date && <span>• {formatDateTime(step.date)}</span>}
                  </div>
                )}
                {step.reason && (
                  <p className="text-sm text-gray-600 mt-2 bg-white border border-gray-200 rounded p-2">
                    "{step.reason}"
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ACTIONS */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold uppercase text-gray-500 mb-4">Take Action</h2>
        <div className="space-y-4">
          <textarea
            className="w-full border border-gray-300 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Add a reason or comment (optional)..."
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex items-center space-x-3">
            <Button
              variant="primary"
              onClick={() => handleAction('APPROVE')}
              disabled={actionLoading}
            >
              <CheckCircle className="w-4 h-4 mr-2" /> Approve
            </Button>
            <Button
              variant="danger"
              onClick={() => handleAction('REJECT')}
              disabled={actionLoading}
            >
              <XCircle className="w-4 h-4 mr-2" /> Reject
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAction('RETURN')}
              disabled={actionLoading}
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Return for Revision
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
