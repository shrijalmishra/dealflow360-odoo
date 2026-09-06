import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecommendation, acceptSplit, consolidateBackorder } from '../services/fulfillmentApi';
import { Button, StatusBadge } from '../components/common/UI';
import { formatMoney, formatDate } from '../utils/formatters';
import {
  Loader2,
  RefreshCw,
  ArrowLeft,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import api from '../services/api';

/* ── Fulfillment Order List (no orderId) ── */
function FulfillmentList() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/reporting/quotations');
      const list = res.quotations || res.data?.quotations || [];
      setOrders(list);
    } catch (e) {
      setError(e?.error?.message || e?.message || 'Failed to load fulfillment queue.');
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
        <span>FETCHING FULFILLMENT QUEUE...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-3 py-20">
        <p className="text-rose-400 font-mono-num text-xs uppercase">{error}</p>
        <Button variant="outline" onClick={load} className="font-mono-num text-xs">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> RETRY
        </Button>
      </div>
    );
  }

  const fulfillable = orders.filter((o) =>
    ['CUSTOMER_CONFIRMED', 'ORDER_CREATED', 'FULFILLMENT', 'PARTIALLY_FULFILLED', 'APPROVED', 'FULFILLED'].includes(o.status)
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-[#222222] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white uppercase font-mono-num">
            FULFILLMENT & WAREHOUSE DISPATCH
          </h1>
          <p className="text-xs text-zinc-500 font-mono-num mt-0.5">
            Multi-warehouse inventory allocation, split-shipment optimization & backorder consolidation
          </p>
        </div>
        <Button variant="outline" onClick={load} className="font-mono-num text-xs">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> REFRESH
        </Button>
      </div>

      {/* Queue Table */}
      {fulfillable.length === 0 ? (
        <div className="py-16 text-center text-zinc-500 font-mono-num text-xs border-y border-[#222222]">
          NO ORDERS CURRENTLY READY FOR DISPATCH ALLOCATION
        </div>
      ) : (
        <div className="overflow-x-auto border-y border-[#222222]">
          <table className="w-full text-xs font-mono-num">
            <thead>
              <tr className="border-b border-[#222222] text-zinc-500">
                <th className="py-2.5 px-4 text-left font-semibold">ORDER / REF</th>
                <th className="py-2.5 px-4 text-left font-semibold">CUSTOMER</th>
                <th className="py-2.5 px-4 text-right font-semibold">VALUE</th>
                <th className="py-2.5 px-4 text-center font-semibold">STATUS</th>
                <th className="py-2.5 px-4 text-center font-semibold">FULFILLMENT</th>
                <th className="py-2.5 px-4 text-left font-semibold">DATE</th>
                <th className="py-2.5 px-4 text-right font-semibold">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f]">
              {fulfillable.map((o) => (
                <tr
                  key={o.id}
                  className="hover:bg-[#111111] transition-colors cursor-pointer group"
                  onClick={() => navigate(`/fulfillment/${o.id}`)}
                >
                  <td className="py-3 px-4 font-bold text-white tracking-wide">
                    {o.quoteNumber || `ORD-${o.id.substring(0, 8).toUpperCase()}`}
                  </td>
                  <td className="py-3 px-4 text-zinc-200">
                    {o.customerName || 'Enterprise Client'}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-white">
                    {formatMoney(o.grandTotal || o.netTotal || 0)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`text-[10px] font-mono-num uppercase font-bold px-2 py-0.5 rounded-sm border ${
                      o.fulfillmentStatus === 'BACKORDERED'
                        ? 'text-rose-400 border-rose-500/30 bg-rose-500/10'
                        : o.fulfillmentStatus === 'FULFILLED'
                        ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                        : 'text-zinc-400 border-zinc-800 bg-zinc-900'
                    }`}>
                      {o.fulfillmentStatus || 'PENDING'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-zinc-500">
                    {formatDate(o.createdAt)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/fulfillment/${o.id}`);
                      }}
                      className="px-2.5 py-1 text-[11px] font-mono-num bg-white text-black font-semibold rounded-sm hover:bg-zinc-200 transition-colors"
                    >
                      OPTIMIZE SPLIT →
                    </button>
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

/* ── Fulfillment Recommendation & Split Detail (with orderId) ── */
function FulfillmentDetail({ oId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getRecommendation(oId);
      setData(res.data || res);
    } catch (e) {
      setError(e?.error?.message || e?.message || 'Failed to compute fulfillment split allocation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [oId]);

  const handleAccept = async () => {
    try {
      setAccepting(true);
      await acceptSplit(oId, { split: data?.split });
      setAccepted(true);
    } catch (e) {
      alert(e?.error?.message || e?.message || 'Failed to dispatch fulfillment split.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full space-x-3 text-zinc-500 font-mono-num text-xs py-20">
        <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
        <span>COMPUTING INVENTORY ALLOCATION SPLITS...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 py-20">
        <p className="text-rose-400 font-mono-num text-xs uppercase">{error}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/fulfillment')} className="font-mono-num">
            ← FULFILLMENT QUEUE
          </Button>
          <Button variant="outline" onClick={load} className="font-mono-num">
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
            onClick={() => navigate('/fulfillment')}
            className="p-1.5 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white font-mono-num uppercase">
              FULFILLMENT ALLOCATION — {data.orderId || oId}
            </h1>
            <p className="text-xs text-zinc-500 font-mono-num mt-0.5">
              Automated multi-depot stock allocation & carrier routing
            </p>
          </div>
        </div>
        <StatusBadge status={accepted ? 'FULFILLED' : 'PROCESSING'} />
      </div>

      {accepted && (
        <div className="p-3 text-xs font-mono-num border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 rounded-sm flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Fulfillment split plan successfully dispatched to warehouse distribution hubs.</span>
        </div>
      )}

      {/* Numerical Metrics Row (24-32px) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-5 bg-[#111111] border border-[#222222] rounded-sm font-mono-num">
        <div>
          <p className="editorial-label">DISPATCH SHIPMENTS</p>
          <p className="text-2xl font-bold text-white mt-1">
            {data.shipmentCount ?? (data.split?.length || 1)}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">Separate depot origins</p>
        </div>
        <div>
          <p className="editorial-label">TOTAL LOGISTICS COST</p>
          <p className="text-2xl font-bold text-white mt-1">
            {formatMoney(data.totalShippingCost || 120)}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">Optimized routing</p>
        </div>
        <div>
          <p className="editorial-label">BACKORDERED ITEMS</p>
          <p className={`text-2xl font-bold mt-1 ${data.backorderQuantity > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {data.backorderQuantity || 0}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">Units awaiting depot restock</p>
        </div>
      </div>

      {/* Warehouse Splits Table */}
      <div className="space-y-3">
        <p className="editorial-label">WAREHOUSE ALLOCATION SCHEDULE</p>
        <div className="border border-[#222222] bg-[#111111] rounded-sm overflow-hidden">
          <table className="w-full text-xs font-mono-num text-left">
            <thead className="bg-[#0a0a0a] text-zinc-500 uppercase border-b border-[#222222]">
              <tr>
                <th className="px-4 py-2.5">ORIGIN DEPOT</th>
                <th className="px-4 py-2.5">CARRIER / ROUTE</th>
                <th className="px-4 py-2.5 text-center">EST. TRANSIT</th>
                <th className="px-4 py-2.5 text-right">FREIGHT COST</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f]">
              {(data.split || []).map((s, idx) => (
                <tr key={idx} className="hover:bg-[#161616]">
                  <td className="px-4 py-3 text-zinc-200 font-semibold">{s.warehouse || `Warehouse Hub ${idx + 1}`}</td>
                  <td className="px-4 py-3 text-zinc-400">{s.carrier || 'Express Surface Freight'}</td>
                  <td className="px-4 py-3 text-center text-zinc-300">{s.estimatedDays || 2} Days</td>
                  <td className="px-4 py-3 text-right text-white font-bold">{formatMoney(s.shippingCost || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Footer */}
      {!accepted && (
        <div className="flex items-center justify-end space-x-3 pt-3">
          <Button
            variant="outline"
            onClick={() => navigate('/fulfillment')}
            className="font-mono-num text-xs"
          >
            CANCEL
          </Button>
          <Button
            variant="primary"
            onClick={handleAccept}
            disabled={accepting}
            className="font-mono-num text-xs px-5"
          >
            {accepting ? 'DISPATCHING...' : 'DISPATCH FULFILLMENT PLAN'}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function Fulfillment() {
  const { orderId } = useParams();
  if (orderId) return <FulfillmentDetail oId={orderId} />;
  return <FulfillmentList />;
}
