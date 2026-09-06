import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQuotes } from '../services/quoteApi';
import { Button } from '../components/common/UI';
import { formatMoney } from '../utils/formatters';
import { QUOTE_STATUS } from '../constants/enums';
import { Loader2, RefreshCw } from 'lucide-react';

const PIPELINE_COLUMNS = [
  { key: QUOTE_STATUS.DRAFT,              label: 'DRAFT' },
  { key: QUOTE_STATUS.PENDING_APPROVAL,   label: 'PENDING APPROVAL' },
  { key: QUOTE_STATUS.APPROVED,           label: 'APPROVED' },
  { key: QUOTE_STATUS.SENT,               label: 'SENT TO CLIENT' },
  { key: QUOTE_STATUS.UNDER_NEGOTIATION,  label: 'NEGOTIATION' },
  { key: QUOTE_STATUS.CONFIRMED,          label: 'CONFIRMED' },
  { key: QUOTE_STATUS.FULFILLMENT,        label: 'FULFILLMENT' },
  { key: QUOTE_STATUS.FULFILLED,          label: 'FULFILLED' },
];

export default function Pipeline() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getQuotes();
      setQuotes(res.data || (Array.isArray(res) ? res : []));
    } catch (err) {
      setError(err?.error?.message || err?.message || 'Failed to load pipeline.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full space-x-3 text-zinc-500 font-mono-num text-xs py-20">
        <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
        <span>LOADING PIPELINE LANES...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-3 py-20">
        <p className="text-rose-400 font-mono-num text-xs uppercase">{error}</p>
        <Button variant="outline" onClick={fetchData} className="font-mono-num">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> RETRY
        </Button>
      </div>
    );
  }

  const grouped = {};
  PIPELINE_COLUMNS.forEach((col) => {
    grouped[col.key] = quotes.filter((q) => q.status === col.key);
  });

  return (
    <div className="flex flex-col h-full space-y-5 pb-6">
      {/* ── HEADER ── */}
      <div className="flex items-baseline justify-between border-b border-[#222222] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white uppercase font-mono-num">
            SALES PIPELINE KANBAN
          </h1>
          <p className="text-xs text-zinc-500 font-mono-num mt-0.5">
            Real-time quotation velocity across governance and fulfillment stages
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} className="font-mono-num text-xs">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> REFRESH
        </Button>
      </div>

      {/* ── KANBAN ARCHITECTURAL LANES ── */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 h-full min-w-max pb-2">
          {PIPELINE_COLUMNS.map((col) => {
            const list = grouped[col.key] || [];
            return (
              <div
                key={col.key}
                className="w-64 flex flex-col flex-shrink-0 bg-[#0c0c0c] border border-[#222222] rounded-sm overflow-hidden"
              >
                {/* Column Header */}
                <div className="p-3 border-b border-[#222222] bg-[#111111] flex items-center justify-between font-mono-num">
                  <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                    {col.label}
                  </span>
                  <span className="text-[11px] font-mono-num text-zinc-500 font-bold">
                    ({list.length})
                  </span>
                </div>

                {/* Deal Cards Container */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[440px] max-h-[calc(100vh-220px)] divide-y divide-[#1f1f1f]">
                  {list.length === 0 ? (
                    <div className="h-28 flex items-center justify-center text-[11px] text-zinc-600 font-mono-num">
                      NO DEALS
                    </div>
                  ) : (
                    list.map((quote) => {
                      const isHighRisk = quote.discountRiskScore > 70;
                      return (
                        <div
                          key={quote.id}
                          onClick={() => navigate(`/quotations/${quote.id}`)}
                          className="pt-2 pb-1 px-2 hover:bg-[#161616] transition-colors cursor-pointer group rounded-sm font-mono-num"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-white group-hover:underline">
                              {quote.quoteNumber}
                            </span>
                            {isHighRisk && (
                              <span className="text-[10px] text-rose-400 border border-rose-500/30 px-1 py-0.2 rounded-sm uppercase">
                                HIGH RISK
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-300 truncate mb-2">{quote.customerName}</p>
                          <div className="flex items-baseline justify-between border-t border-[#1f1f1f] pt-1.5">
                            <span className="text-[10px] text-zinc-500 uppercase">Value</span>
                            <span className="text-xs font-bold text-white">
                              {formatMoney(quote.grandTotal)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
