import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQuotes } from '../services/quoteApi';
import { Card, StatusBadge } from '../components/common/UI';
import { formatMoney } from '../utils/formatters';
import { QUOTE_STATUS } from '../constants/enums';
import { AlertTriangle, Loader2 } from 'lucide-react';

const PIPELINE_COLUMNS = [
  { key: QUOTE_STATUS.DRAFT, label: 'Draft' },
  { key: QUOTE_STATUS.PENDING_APPROVAL, label: 'Pending Approval' },
  { key: QUOTE_STATUS.APPROVED, label: 'Approved' },
  { key: QUOTE_STATUS.SENT, label: 'Sent' },
  { key: QUOTE_STATUS.UNDER_NEGOTIATION, label: 'Negotiation' },
  { key: QUOTE_STATUS.CONFIRMED, label: 'Confirmed' },
  { key: QUOTE_STATUS.FULFILLMENT, label: 'Fulfillment' },
  { key: QUOTE_STATUS.PARTIALLY_FULFILLED, label: 'Partial' },
  { key: QUOTE_STATUS.FULFILLED, label: 'Fulfilled' },
];

const COLUMN_COLORS = {
  DRAFT: 'border-t-gray-400',
  PENDING_APPROVAL: 'border-t-amber-400',
  APPROVED: 'border-t-green-400',
  SENT: 'border-t-blue-400',
  UNDER_NEGOTIATION: 'border-t-purple-400',
  CONFIRMED: 'border-t-emerald-500',
  FULFILLMENT: 'border-t-cyan-400',
  PARTIALLY_FULFILLED: 'border-t-orange-400',
  FULFILLED: 'border-t-green-600',
};

export default function Pipeline() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getQuotes();
        setQuotes(res.data);
      } catch (err) {
        setError(err?.error?.message || 'Failed to load pipeline.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400 mr-3" />
        <p className="text-gray-500">Loading pipeline...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <AlertTriangle className="w-10 h-10 text-red-400" />
        <p className="text-red-600">{error}</p>
        <button onClick={() => window.location.reload()} className="text-sm text-primary-600 hover:underline">Retry</button>
      </div>
    );
  }

  // Group quotes by status
  const grouped = {};
  PIPELINE_COLUMNS.forEach((col) => {
    grouped[col.key] = quotes.filter((q) => q.status === col.key);
  });

  return (
    <div className="flex flex-col h-full space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>

      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-3 h-full min-w-max pb-4">
          {PIPELINE_COLUMNS.map((col) => (
            <div key={col.key} className="w-56 flex flex-col flex-shrink-0">
              {/* COLUMN HEADER */}
              <div className={`bg-white border border-gray-200 border-t-4 ${COLUMN_COLORS[col.key]} rounded-t-lg px-3 py-2 flex items-center justify-between`}>
                <span className="text-xs font-semibold text-gray-700 uppercase">{col.label}</span>
                <span className="text-xs font-bold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                  {grouped[col.key].length}
                </span>
              </div>

              {/* CARDS */}
              <div className="flex-1 bg-gray-100/50 border border-t-0 border-gray-200 rounded-b-lg p-2 space-y-2 overflow-y-auto">
                {grouped[col.key].length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No quotes</p>
                ) : (
                  grouped[col.key].map((quote) => (
                    <div
                      key={quote.id}
                      className="bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => navigate(`/quotations/${quote.id}`)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-900">{quote.quoteNumber}</span>
                        {quote.discountRiskScore > 70 && (
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500" title="High risk" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{quote.customerName}</p>
                      <p className="text-sm font-bold text-gray-900">{formatMoney(quote.grandTotal)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
