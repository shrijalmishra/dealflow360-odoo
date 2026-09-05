import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getQuote, submitNegotiation, confirmQuote } from '../services/portalApi';
import { formatMoney, formatDate } from '../utils/formatters';
import { Badge } from '../components/common/UI';
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
      // Update status locally based on backend response
      if (res.data.newStatus) {
        setQuote((prev) => ({ ...prev, status: res.data.newStatus }));
      }
      if (res.data.approvalRequired) {
        setSuccessMsg(res.data.message + ' Quotation requires approval again.');
      }
    } catch (err) {
      console.error('Negotiation failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    try {
      setConfirming(true);
      const res = await confirmQuote(token);
      setSuccessMsg(res.data.message);
      if (res.data.newStatus) {
        setQuote((prev) => ({ ...prev, status: res.data.newStatus }));
      }
    } catch (err) {
      console.error('Confirmation failed:', err);
    } finally {
      setConfirming(false);
    }
  };

  // STATUS BADGE for portal (simplified, no internal statuses)
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
      <div className="flex flex-col items-center justify-center py-24 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Loading your quotation...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-red-600 font-medium mb-2">Unable to Load Quotation</p>
        <p className="text-gray-500 text-sm">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 text-sm text-primary-600 hover:underline">
          Try Again
        </button>
      </div>
    );
  }

  if (!quote) return null;

  return (
    <div className="space-y-6">

      {/* SUCCESS BANNER */}
      {successMsg && (
        <div className="flex items-center bg-green-50 border border-green-200 rounded-lg p-4">
          <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
          <p className="text-sm text-green-800">{successMsg}</p>
          <button onClick={() => setSuccessMsg('')} className="ml-auto text-green-400 hover:text-green-600 text-lg">&times;</button>
        </div>
      )}

      {/* QUOTE HEADER */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{quote.quoteNumber}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Prepared for <span className="font-medium text-gray-800">{quote.customerName}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">Date: {formatDate(quote.created)}</p>
          </div>
          <Badge variant={getStatusStyle(quote.status)}>
            {formatStatus(quote.status)}
          </Badge>
        </div>
      </div>

      {/* PRODUCT TABLE */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-900">Products & Services</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b">
              <tr>
                <th className="px-6 py-3 text-left">Product</th>
                <th className="px-6 py-3 text-center">Qty</th>
                <th className="px-6 py-3 text-right">Unit Price</th>
                <th className="px-6 py-3 text-right">Discount</th>
                <th className="px-6 py-3 text-right">Total</th>
                {negotiationMode && <th className="px-6 py-3 text-left">Comment</th>}
              </tr>
            </thead>
            <tbody>
              {quote.lines?.map((line) => (
                <tr key={line.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{line.productName}</p>
                    <p className="text-xs text-gray-500">{line.type?.replace(/_/g, ' ')}</p>
                  </td>
                  <td className="px-6 py-4 text-center">{line.quantity}</td>
                  <td className="px-6 py-4 text-right">{formatMoney(line.unitPrice)}</td>
                  <td className="px-6 py-4 text-right text-red-600">{line.discountPercent}%</td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">{formatMoney(line.lineTotal)}</td>
                  {negotiationMode && (
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        placeholder="Add comment..."
                        value={lineComments[line.id] || ''}
                        onChange={(e) => handleLineComment(line.id, e.target.value)}
                        className="w-full p-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TOTALS */}
        <div className="border-t border-gray-200 bg-gray-50/50 px-6 py-4">
          <div className="flex justify-end">
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900 font-medium">{formatMoney(quote.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Discount</span>
                <span className="text-red-600 font-medium">-{formatMoney(quote.discountTotal)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-600">Tax</span>
                <span className="text-gray-900 font-medium">{formatMoney(quote.taxTotal)}</span>
              </div>
              <div className="flex justify-between pt-1 text-lg">
                <span className="font-bold text-gray-900">Grand Total</span>
                <span className="font-bold text-gray-900">{formatMoney(quote.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NEGOTIATION FORM */}
      {negotiationMode && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center">
            <MessageSquare className="w-4 h-4 mr-2 text-primary-600" />
            Submit a Change Request
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">General Change Request</label>
            <textarea
              className="w-full border border-gray-300 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Describe what you'd like changed..."
              rows={3}
              value={changeRequest}
              onChange={(e) => setChangeRequest(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Counter Discount (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="e.g. 15"
              value={counterDiscount}
              onChange={(e) => setCounterDiscount(e.target.value)}
              className="w-40 border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={handleSubmitNegotiation}
              disabled={submitting}
              className="inline-flex items-center px-5 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Submit Request
            </button>
            <button
              onClick={() => setNegotiationMode(false)}
              className="inline-flex items-center px-5 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ACTIONS */}
      {!negotiationMode && (
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setNegotiationMode(true)}
            className="inline-flex items-center px-5 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Request Changes
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming || quote.status === 'CONFIRMED'}
            className="inline-flex items-center px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {confirming ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
            Confirm Quotation
          </button>
        </div>
      )}
    </div>
  );
}
