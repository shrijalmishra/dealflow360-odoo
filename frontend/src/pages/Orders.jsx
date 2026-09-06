import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, StatusBadge } from '../components/common/UI';
import { formatMoney, formatDate } from '../utils/formatters';
import { Search, Loader2, RefreshCw } from 'lucide-react';
import api from '../services/api';

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/reporting/quotations');
      const list = res.quotations || res.data?.quotations || [];
      setOrders(list);
    } catch (err) {
      setError(err?.message || 'Failed to fetch live orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filtered = orders.filter((o) => {
    const term = search.toLowerCase();
    return (
      (o.id && o.id.toLowerCase().includes(term)) ||
      (o.customerName && o.customerName.toLowerCase().includes(term)) ||
      (o.repName && o.repName.toLowerCase().includes(term)) ||
      (o.status && o.status.toLowerCase().includes(term))
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full space-x-3 text-zinc-500 font-mono-num text-xs py-20">
        <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
        <span>FETCHING ORDERS DISPATCH LEDGER...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-3 py-20">
        <p className="text-rose-400 font-mono-num text-xs uppercase">{error}</p>
        <Button variant="outline" onClick={fetchOrders} className="font-mono-num">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> RETRY
        </Button>
      </div>
    );
  }

  const activeOrders = orders.filter((o) =>
    ['CUSTOMER_CONFIRMED', 'ORDER_CREATED', 'FULFILLMENT', 'PARTIALLY_FULFILLED'].includes(o.status)
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-[#222222] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white uppercase font-mono-num">
            OPERATIONS & DISPATCH ORDERS
          </h1>
          <p className="text-xs text-zinc-500 font-mono-num mt-0.5">
            Confirmed customer purchase orders, warehouse splits & dispatch status
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-xs font-mono-num text-zinc-400">
            {activeOrders.length} ACTIVE ORDERS
          </span>
          <Button variant="outline" onClick={fetchOrders} className="font-mono-num text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> REFRESH
          </Button>
        </div>
      </div>

      {/* Search Input */}
      <div className="flex items-center justify-between border-b border-[#222222] pb-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search orders by ID, client, or rep..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#111111] border border-[#222222] rounded-sm pl-8 pr-3 py-1.5 text-xs font-mono-num text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
          />
        </div>
      </div>

      {/* Flat Orders Table */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-zinc-500 font-mono-num text-xs border-y border-[#222222]">
          NO ORDERS FOUND MATCHING QUERY
        </div>
      ) : (
        <div className="overflow-x-auto border-y border-[#222222]">
          <table className="w-full text-xs font-mono-num">
            <thead>
              <tr className="border-b border-[#222222] text-zinc-500">
                <th className="py-2.5 px-4 text-left font-semibold">ORDER / REF</th>
                <th className="py-2.5 px-4 text-left font-semibold">CUSTOMER</th>
                <th className="py-2.5 px-4 text-right font-semibold">VALUE</th>
                <th className="py-2.5 px-4 text-center font-semibold">ORDER STATUS</th>
                <th className="py-2.5 px-4 text-center font-semibold">FULFILLMENT</th>
                <th className="py-2.5 px-4 text-left font-semibold">DATE</th>
                <th className="py-2.5 px-4 text-right font-semibold">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f]">
              {filtered.map((o) => (
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
                      className="text-zinc-500 group-hover:text-white transition-colors"
                    >
                      FULFILL →
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
