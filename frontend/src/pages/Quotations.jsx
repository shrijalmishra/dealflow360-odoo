import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQuotes } from '../services/quoteApi';
import { Button, StatusBadge } from '../components/common/UI';
import { formatMoney, formatDate } from '../utils/formatters';
import { Search, Plus, Loader2, RefreshCw } from 'lucide-react';

export default function Quotations() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('updated');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getQuotes();
        setQuotes(res.data || []);
      } catch (err) {
        setError(err?.error?.message || 'Failed to load quotations ledger.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = quotes
    .filter((q) => {
      if (!searchTerm) return true;
      const t = searchTerm.toLowerCase();
      return (
        q.quoteNumber?.toLowerCase().includes(t) ||
        q.customerName?.toLowerCase().includes(t) ||
        q.assignedRep?.toLowerCase().includes(t)
      );
    })
    .filter((q) => !statusFilter || q.status === statusFilter)
    .sort((a, b) => {
      const av = a[sortField], bv = b[sortField];
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIndicator = ({ field }) =>
    sortField === field ? (
      <span className="ml-1 text-white font-mono-num">{sortDir === 'asc' ? '↑' : '↓'}</span>
    ) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full space-x-3 text-zinc-500 font-mono-num text-xs py-20">
        <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
        <span>LOADING QUOTATIONS LEDGER...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-3 py-20">
        <p className="text-rose-400 font-mono-num text-xs uppercase">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()} className="font-mono-num">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> RETRY
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* ── HEADER ── */}
      <div className="flex items-baseline justify-between border-b border-[#222222] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white uppercase font-mono-num">
            COMMERCIAL QUOTATIONS
          </h1>
          <p className="text-xs text-zinc-500 font-mono-num mt-0.5">
            {filtered.length} quotations registered · Pricing calculations & approvals
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate('/quotations/new')}
          className="font-mono-num text-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" /> NEW QUOTATION
        </Button>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222222] pb-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by quote, client, rep..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#111111] border border-[#222222] rounded-sm pl-8 pr-3 py-1.5 text-xs font-mono-num text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#111111] border border-[#222222] text-zinc-300 text-xs font-mono-num px-3 py-1.5 rounded-sm focus:outline-none focus:border-zinc-500"
          >
            <option value="">ALL STATUSES</option>
            <option value="DRAFT">DRAFT</option>
            <option value="PENDING_APPROVAL">PENDING APPROVAL</option>
            <option value="APPROVED">APPROVED</option>
            <option value="SENT">SENT TO CLIENT</option>
            <option value="UNDER_NEGOTIATION">UNDER NEGOTIATION</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
      </div>

      {/* ── FLAT EDITORIAL TABLE ── */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-zinc-500 font-mono-num text-xs border-y border-[#222222]">
          NO QUOTATIONS FOUND
        </div>
      ) : (
        <div className="overflow-x-auto border-y border-[#222222]">
          <table className="w-full text-xs font-mono-num">
            <thead>
              <tr className="border-b border-[#222222] text-zinc-500">
                {[
                  { label: 'QUOTE #',    field: 'quoteNumber', align: 'text-left' },
                  { label: 'CUSTOMER',   field: 'customerName', align: 'text-left' },
                  { label: 'AMOUNT',     field: 'grandTotal',   align: 'text-right' },
                  { label: 'STATUS',     field: null,           align: 'text-center' },
                  { label: 'GOVERNANCE', field: null,           align: 'text-center' },
                  { label: 'CREATED',    field: 'created',      align: 'text-left' },
                  { label: 'SALES REP',  field: null,           align: 'text-left' },
                  { label: '',           field: null,           align: 'text-right' },
                ].map((col) => (
                  <th
                    key={col.label}
                    className={`py-2.5 px-3 uppercase tracking-wider font-semibold text-[11px] ${col.align} ${
                      col.field ? 'cursor-pointer hover:text-white transition-colors' : ''
                    }`}
                    onClick={col.field ? () => handleSort(col.field) : undefined}
                  >
                    {col.label}
                    {col.field && <SortIndicator field={col.field} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f]">
              {filtered.map((q) => (
                <tr
                  key={q.id}
                  className="hover:bg-[#111111] transition-colors cursor-pointer group"
                  onClick={() => navigate(`/quotations/${q.id}`)}
                >
                  <td className="py-3 px-3 font-bold text-white tracking-wide">
                    {q.quoteNumber}
                  </td>
                  <td className="py-3 px-3 text-zinc-200">
                    <span>{q.customerName}</span>
                    {q.customerTier && (
                      <span className="ml-1.5 text-[10px] text-zinc-500 uppercase">
                        ({q.customerTier})
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-white">
                    {formatMoney(q.grandTotal)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <StatusBadge status={q.status} />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <StatusBadge status={q.approval?.status || 'NOT_REQUIRED'} />
                  </td>
                  <td className="py-3 px-3 text-zinc-500">
                    {formatDate(q.created)}
                  </td>
                  <td className="py-3 px-3 text-zinc-400">
                    {q.assignedRep || 'Sales Rep'}
                  </td>
                  <td className="py-3 px-3 text-right text-zinc-600 group-hover:text-white transition-colors">
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
