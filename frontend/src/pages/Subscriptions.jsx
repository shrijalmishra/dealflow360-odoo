import React, { useState, useEffect } from 'react';
import { getSubscriptions, cancelSubscription } from '../services/subscriptionApi';
import { Button, StatusBadge } from '../components/common/UI';
import { formatMoney, formatDate } from '../utils/formatters';
import { Loader2, RefreshCw } from 'lucide-react';

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  const fetchSubs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getSubscriptions();
      const list = res.subscriptions || res.data?.subscriptions || (Array.isArray(res.data) ? res.data : []);
      setSubscriptions(list);
    } catch (err) {
      setError(err?.error?.message || err?.message || 'Failed to load recurring subscriptions ledger.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubs();
  }, []);

  const handleCancel = async (subId) => {
    if (!window.confirm('Terminate this recurring subscription contract?')) return;
    try {
      setActionLoading((p) => ({ ...p, [subId]: true }));
      await cancelSubscription(subId);
      await fetchSubs();
    } catch (err) {
      alert(err?.error?.message || err?.message || 'Cancellation request failed.');
    } finally {
      setActionLoading((p) => ({ ...p, [subId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full space-x-3 text-zinc-500 font-mono-num text-xs py-20">
        <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
        <span>LOADING RECURRING CONTRACTS LEDGER...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-3 py-20">
        <p className="text-rose-400 font-mono-num text-xs uppercase">{error}</p>
        <Button variant="outline" onClick={fetchSubs} className="font-mono-num">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> RETRY
        </Button>
      </div>
    );
  }

  const activeSubs = subscriptions.filter((s) => s.status === 'ACTIVE');

  const mrr = activeSubs.reduce((sum, s) => {
    const amt = Number(s.plan?.price || s.amount || 0);
    const freq = s.plan?.frequency || 'MONTHLY';
    if (freq === 'YEARLY') return sum + amt / 12;
    if (freq === 'QUARTERLY') return sum + amt / 3;
    return sum + amt;
  }, 0);
  const arr = mrr * 12;

  const getCustomer = (s) => s.quotation?.customer?.name || 'Enterprise Client';
  const getProduct  = (s) => s.plan?.product?.name || 'Subscription Plan';
  const getFreq     = (s) => s.plan?.frequency || 'MONTHLY';
  const getAmount   = (s) => s.plan?.price ?? s.amount ?? 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-[#222222] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white uppercase font-mono-num">
            RECURRING SUBSCRIPTIONS
          </h1>
          <p className="text-xs text-zinc-500 font-mono-num mt-0.5">
            Contract lifecycle, MRR run-rate & recurring service renewals
          </p>
        </div>
        <Button variant="outline" onClick={fetchSubs} className="font-mono-num text-xs">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> REFRESH
        </Button>
      </div>

      {/* Summary Metrics Row (24-32px) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-b border-[#222222] pb-6">
        <div>
          <p className="editorial-label">MONTHLY RECURRING (MRR)</p>
          <p className="text-2xl font-bold text-white font-mono-num mt-1.5">
            {formatMoney(mrr)}
          </p>
          <p className="text-xs text-zinc-500 font-mono-num mt-0.5">
            Monthly run-rate baseline
          </p>
        </div>

        <div>
          <p className="editorial-label">ANNUAL RUN RATE (ARR)</p>
          <p className="text-2xl font-bold text-white font-mono-num mt-1.5">
            {formatMoney(arr)}
          </p>
          <p className="text-xs text-zinc-500 font-mono-num mt-0.5">
            Projected 12-month value
          </p>
        </div>

        <div>
          <p className="editorial-label">ACTIVE CONTRACTS</p>
          <p className="text-2xl font-bold text-white font-mono-num mt-1.5">
            {activeSubs.length}
          </p>
          <p className="text-xs text-zinc-500 font-mono-num mt-0.5">
            Of {subscriptions.length} total registered
          </p>
        </div>
      </div>

      {/* Contracts Table */}
      {subscriptions.length === 0 ? (
        <div className="py-16 text-center text-zinc-500 font-mono-num text-xs border-y border-[#222222]">
          NO ACTIVE RECURRING SUBSCRIPTIONS FOUND
        </div>
      ) : (
        <div className="overflow-x-auto border-y border-[#222222]">
          <table className="w-full text-xs font-mono-num">
            <thead>
              <tr className="border-b border-[#222222] text-zinc-500">
                <th className="py-2.5 px-4 text-left font-semibold">SUBSCRIPTION ID</th>
                <th className="py-2.5 px-4 text-left font-semibold">CUSTOMER</th>
                <th className="py-2.5 px-4 text-left font-semibold">PLAN / SERVICE</th>
                <th className="py-2.5 px-4 text-left font-semibold">CADENCE</th>
                <th className="py-2.5 px-4 text-right font-semibold">AMOUNT</th>
                <th className="py-2.5 px-4 text-center font-semibold">STATUS</th>
                <th className="py-2.5 px-4 text-left font-semibold">START DATE</th>
                <th className="py-2.5 px-4 text-right font-semibold">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f]">
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-[#111111] transition-colors">
                  <td className="py-3 px-4 font-bold text-white tracking-wide">
                    SUB-{sub.id.substring(0, 8).toUpperCase()}
                  </td>
                  <td className="py-3 px-4 text-zinc-200">
                    {getCustomer(sub)}
                  </td>
                  <td className="py-3 px-4 text-zinc-300">
                    {getProduct(sub)}
                  </td>
                  <td className="py-3 px-4 text-zinc-400 uppercase">
                    {getFreq(sub)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-white">
                    {formatMoney(getAmount(sub))}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={sub.status} />
                  </td>
                  <td className="py-3 px-4 text-zinc-500">
                    {formatDate(sub.startDate || sub.createdAt)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {sub.status === 'ACTIVE' ? (
                      <button
                        onClick={() => handleCancel(sub.id)}
                        disabled={actionLoading[sub.id]}
                        className="text-[11px] text-rose-400 hover:text-rose-300 font-mono-num uppercase transition-colors"
                      >
                        {actionLoading[sub.id] ? 'CANCELING...' : 'CANCEL'}
                      </button>
                    ) : (
                      <span className="text-zinc-600 text-[11px] uppercase">TERMINATED</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
