import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBilling, listAllInvoices, submitPayment } from '../services/billingApi';
import { Button, StatusBadge } from '../components/common/UI';
import { formatMoney, formatDate } from '../utils/formatters';
import {
  CreditCard,
  Receipt,
  CalendarDays,
  Loader2,
  ExternalLink,
  RefreshCw,
  ArrowLeft,
  CheckCircle
} from 'lucide-react';

/* ── Invoice List (no orderId) ── */
function BillingList() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await listAllInvoices();
      setInvoices(list || []);
    } catch (e) {
      setError(e?.error?.message || e?.message || 'Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full space-x-3 text-zinc-500 font-mono-num text-xs py-20">
        <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
        <span>LOADING INVOICE LEDGER...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-3 py-20">
        <p className="text-rose-400 font-mono-num text-xs uppercase">{error}</p>
        <Button variant="outline" onClick={load} className="font-mono-num">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> RETRY
        </Button>
      </div>
    );
  }

  const totalOutstanding = invoices.reduce((s, i) => s + (i.remaining || 0), 0);
  const totalCollected   = invoices.reduce((s, i) => s + (i.paid || 0), 0);
  const totalInvoiced    = invoices.reduce((s, i) => s + (i.total || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-[#222222] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white uppercase font-mono-num">
            BILLING & RECEIVABLES
          </h1>
          <p className="text-xs text-zinc-500 font-mono-num mt-0.5">
            Commercial invoice ledger, payment settlements & collections
          </p>
        </div>
        <Button variant="outline" onClick={load} className="font-mono-num text-xs">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> REFRESH
        </Button>
      </div>

      {/* Summary Metrics Row (24-32px) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-b border-[#222222] pb-6">
        <div>
          <p className="editorial-label">TOTAL INVOICED</p>
          <p className="text-2xl font-bold text-white font-mono-num mt-1.5">
            {formatMoney(totalInvoiced)}
          </p>
          <p className="text-xs text-zinc-500 font-mono-num mt-0.5">
            {invoices.length} invoices generated
          </p>
        </div>

        <div>
          <p className="editorial-label">SETTLED (COLLECTED)</p>
          <p className="text-2xl font-bold text-emerald-400 font-mono-num mt-1.5">
            {formatMoney(totalCollected)}
          </p>
          <p className="text-xs text-zinc-500 font-mono-num mt-0.5">
            Realized cash inflow
          </p>
        </div>

        <div>
          <p className="editorial-label">OUTSTANDING RECEIVABLES</p>
          <p className="text-2xl font-bold text-amber-400 font-mono-num mt-1.5">
            {formatMoney(totalOutstanding)}
          </p>
          <p className="text-xs text-zinc-500 font-mono-num mt-0.5">
            Awaiting client remittance
          </p>
        </div>
      </div>

      {/* Table */}
      {invoices.length === 0 ? (
        <div className="py-16 text-center text-zinc-500 font-mono-num text-xs border-y border-[#222222]">
          NO INVOICES RECORDED YET
        </div>
      ) : (
        <div className="overflow-x-auto border-y border-[#222222]">
          <table className="w-full text-xs font-mono-num">
            <thead>
              <tr className="border-b border-[#222222] text-zinc-500">
                <th className="py-2.5 px-4 text-left font-semibold">INVOICE #</th>
                <th className="py-2.5 px-4 text-left font-semibold">CUSTOMER</th>
                <th className="py-2.5 px-4 text-right font-semibold">TOTAL</th>
                <th className="py-2.5 px-4 text-right font-semibold">COLLECTED</th>
                <th className="py-2.5 px-4 text-right font-semibold">OUTSTANDING</th>
                <th className="py-2.5 px-4 text-center font-semibold">STATUS</th>
                <th className="py-2.5 px-4 text-left font-semibold">DATE</th>
                <th className="py-2.5 px-4 text-right font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f]">
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="hover:bg-[#111111] transition-colors cursor-pointer group"
                  onClick={() => navigate(`/billing/${inv.quotationId || inv.id}`)}
                >
                  <td className="py-3 px-4 font-bold text-white tracking-wide">
                    {inv.invoiceNumber}
                  </td>
                  <td className="py-3 px-4 text-zinc-200">
                    {inv.customerName}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-white">
                    {formatMoney(inv.total)}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-400 font-medium">
                    {formatMoney(inv.paid)}
                  </td>
                  <td className="py-3 px-4 text-right text-amber-400 font-medium">
                    {formatMoney(inv.remaining)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="py-3 px-4 text-zinc-500">
                    {formatDate(inv.createdAt)}
                  </td>
                  <td className="py-3 px-4 text-right text-zinc-600 group-hover:text-white transition-colors">
                    →
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

/* ── Invoice Detail (with orderId) ── */
function BillingDetail({ oId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await getBilling(oId);
        setData(res.data);
      } catch (e) {
        setError(e?.error?.message || e?.message || 'Failed to load billing data.');
      } finally {
        setLoading(false);
      }
    })();
  }, [oId]);

  const handlePay = async () => {
    try {
      setPaying(true);
      await submitPayment(oId, { amount: data.remaining });
      setPaid(true);
    } catch (e) {
      alert(e?.error?.message || e?.message || 'Payment processing failed.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full space-x-3 text-zinc-500 font-mono-num text-xs py-20">
        <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
        <span>FETCHING INVOICE TRANSACTION...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 py-20">
        <p className="text-rose-400 font-mono-num text-xs uppercase">{error}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/billing')} className="font-mono-num">
            ← INVOICE LEDGER
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()} className="font-mono-num">
            RETRY
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-[#222222] pb-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/billing')}
            className="p-1.5 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white font-mono-num uppercase">
              INVOICE {data.invoiceNumber}
            </h1>
            <p className="text-xs text-zinc-500 font-mono-num mt-0.5">
              Client: {data.customerName || 'Commercial Client'} · Order Ref: {oId}
            </p>
          </div>
        </div>
        <StatusBadge status={paid ? 'PAID' : data.invoiceStatus} />
      </div>

      {/* Numerical Ledger Metrics (24-32px) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-5 bg-[#111111] border border-[#222222] rounded-sm">
        <div>
          <p className="editorial-label">TOTAL INVOICE</p>
          <p className="text-2xl font-bold text-white font-mono-num mt-1">
            {formatMoney(data.total)}
          </p>
        </div>
        <div>
          <p className="editorial-label">COLLECTED</p>
          <p className="text-2xl font-bold text-emerald-400 font-mono-num mt-1">
            {formatMoney(paid ? data.total : data.paid)}
          </p>
        </div>
        <div>
          <p className="editorial-label">REMAINING BALANCE</p>
          <p className="text-2xl font-bold text-amber-400 font-mono-num mt-1">
            {formatMoney(paid ? 0 : data.remaining)}
          </p>
        </div>
      </div>

      {/* Invoice Line Breakdown */}
      {data.lines && data.lines.length > 0 && (
        <div className="space-y-3">
          <p className="editorial-label">INVOICED LINE ITEMS</p>
          <div className="border border-[#222222] bg-[#111111] rounded-sm overflow-hidden">
            <table className="w-full text-xs font-mono-num text-left">
              <thead className="bg-[#0a0a0a] text-zinc-500 uppercase border-b border-[#222222]">
                <tr>
                  <th className="px-4 py-2.5">ITEM</th>
                  <th className="px-4 py-2.5 text-center">QTY</th>
                  <th className="px-4 py-2.5 text-right">UNIT PRICE</th>
                  <th className="px-4 py-2.5 text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f1f]">
                {data.lines.map((l, idx) => (
                  <tr key={idx} className="hover:bg-[#161616] transition-colors">
                    <td className="px-4 py-2.5 text-zinc-200 font-medium">{l.productName || l.description}</td>
                    <td className="px-4 py-2.5 text-center text-zinc-400">{l.quantity}</td>
                    <td className="px-4 py-2.5 text-right text-zinc-300">{formatMoney(l.unitPrice)}</td>
                    <td className="px-4 py-2.5 text-right text-white font-bold">{formatMoney(l.lineTotal || l.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settlement Action */}
      {!paid && (data.remaining > 0) && (
        <div className="p-5 bg-[#111111] border border-[#222222] rounded-sm flex items-center justify-between">
          <div>
            <p className="editorial-label">SETTLE BALANCE</p>
            <p className="text-xs text-zinc-400 font-mono-num mt-0.5">
              Record payment receipt of {formatMoney(data.remaining)}
            </p>
          </div>
          <Button
            variant="primary"
            onClick={handlePay}
            disabled={paying}
            className="font-mono-num text-xs px-5"
          >
            {paying ? 'SETTLING...' : 'RECORD SETTLEMENT'}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function Billing() {
  const { orderId } = useParams();
  if (orderId) return <BillingDetail oId={orderId} />;
  return <BillingList />;
}
