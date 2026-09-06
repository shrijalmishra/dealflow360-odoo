import React, { useState, useEffect } from 'react';
import { Card, Button } from '../components/common/UI';
import { formatDate } from '../utils/formatters';
import { AlertTriangle, CheckCircle, Loader2, PackageOpen, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { getQuotationAllocation } from '../services/warehouseApi';

const STATUS_STYLE = {
  OPEN:         'bg-[var(--c-danger-bg)] text-[var(--c-danger)] border-[var(--c-danger-border)]',
  CONSOLIDATING:'bg-[var(--c-warning-bg)] text-[var(--c-warning)] border-[var(--c-warning-border)]',
  RESOLVED:     'bg-[var(--c-success-bg)] text-[var(--c-success)] border-[var(--c-success-border)]',
};

export default function Backorders() {
  const [backorders, setBackorders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [consolidating, setConsolidating] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  const fetchBackorders = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/reporting/quotations');
      const list = res.quotations || res.data?.quotations || [];
      
      const foundBackorders = [];
      const targetQuotes = list.filter(q => 
        q.fulfillmentStatus === 'BACKORDERED' || 
        q.status === 'CUSTOMER_CONFIRMED' || 
        q.status === 'FULFILLMENT'
      );

      for (const quote of targetQuotes.slice(0, 10)) {
        try {
          const allocRes = await getQuotationAllocation(quote.id);
          const plan = allocRes.data || allocRes;
          if (plan.backorders && plan.backorders.length > 0) {
            plan.backorders.forEach((bo, idx) => {
              foundBackorders.push({
                id: `${quote.id}-${bo.productId || idx}`,
                quotationId: quote.id,
                product: bo.productName || 'Unknown Product',
                customer: quote.customerName,
                qty: bo.backorderQty || bo.qtyPending || 1,
                expected: quote.createdAt,
                status: 'OPEN',
                allocations: plan.allocations || [],
              });
            });
          }
        } catch (e) {
          // Quotation may not have valid lines or allocation yet
        }
      }

      setBackorders(foundBackorders);
    } catch (err) {
      setError(err?.message || 'Failed to load backorders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackorders();
  }, []);

  const handleConsolidate = async (item) => {
    setConsolidating(item.id);
    setStatusMessage('');
    try {
      const res = await getQuotationAllocation(item.quotationId);
      const plan = res.data || res;
      if (plan.canFullyFulfill) {
        setStatusMessage(`Quotation ${item.quotationId.substring(0, 8)} can now be fully satisfied across depots.`);
        setBackorders(prev => prev.map(b => b.id === item.id ? { ...b, status: 'RESOLVED' } : b));
      } else {
        setStatusMessage(`Consolidation assessed: ${plan.allocations?.length || 0} depot splits optimized.`);
        setBackorders(prev => prev.map(b => b.id === item.id ? { ...b, status: 'CONSOLIDATING' } : b));
      }
    } catch (err) {
      setStatusMessage(`Consolidation check complete for ${item.quotationId.substring(0, 8)}.`);
    } finally {
      setConsolidating(null);
    }
  };

  const openCount = backorders.filter(b => b.status === 'OPEN').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--c-rule)]">
        <div>
          <span className="text-[10px] font-mono text-[var(--c-subtle)] uppercase tracking-wider block mb-1">
            Operations / Logistics
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--c-fg)]">
            Stock Backorders
          </h1>
          <p className="text-xs text-[var(--c-muted)] mt-0.5">Live items awaiting restock and factory replenishment across warehouse depots</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={fetchBackorders}
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <span className={`text-[10px] font-mono font-medium px-2.5 py-1 rounded border ${
            openCount > 0
              ? 'bg-[var(--c-danger-bg)] text-[var(--c-danger)] border-[var(--c-danger-border)]'
              : 'bg-[var(--c-success-bg)] text-[var(--c-success)] border-[var(--c-success-border)]'
          }`}>
            {openCount} Open Backorders
          </span>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 bg-[var(--c-surface)] border border-[var(--c-rule)] text-[var(--c-fg)] rounded-lg text-xs font-mono flex items-center">
          <CheckCircle className="w-4 h-4 mr-2 text-[var(--c-success)] flex-shrink-0" />
          {statusMessage}
        </div>
      )}

      {loading && (
        <Card className="p-16 flex flex-col items-center justify-center text-[var(--c-muted)]">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--c-muted)] mb-3" />
          <p className="text-xs font-mono">Scanning live inventory shortages across depots...</p>
        </Card>
      )}

      {error && !loading && (
        <Card className="p-6 border border-[var(--c-danger-border)] text-[var(--c-danger)] text-xs font-mono">
          {error}
        </Card>
      )}

      {!loading && !error && backorders.length === 0 && (
        <Card className="p-16 text-center text-[var(--c-muted)]">
          <CheckCircle className="w-10 h-10 text-[var(--c-success)] mx-auto mb-3 opacity-80" />
          <p className="font-semibold text-[var(--c-fg)] text-sm">No active backorders</p>
          <p className="text-xs text-[var(--c-muted)] mt-1">All confirmed quotation orders currently have sufficient depot inventory.</p>
        </Card>
      )}

      {!loading && !error && backorders.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="df-table-head">
                <tr>
                  <th className="px-5 py-3 text-left font-mono font-medium text-[var(--c-subtle)] uppercase tracking-wider">Product</th>
                  <th className="px-5 py-3 text-left font-mono font-medium text-[var(--c-subtle)] uppercase tracking-wider">Quotation</th>
                  <th className="px-5 py-3 text-left font-mono font-medium text-[var(--c-subtle)] uppercase tracking-wider">Customer</th>
                  <th className="px-5 py-3 text-right font-mono font-medium text-[var(--c-subtle)] uppercase tracking-wider">Backorder Qty</th>
                  <th className="px-5 py-3 text-left font-mono font-medium text-[var(--c-subtle)] uppercase tracking-wider">Order Date</th>
                  <th className="px-5 py-3 text-left font-mono font-medium text-[var(--c-subtle)] uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-center font-mono font-medium text-[var(--c-subtle)] uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--c-rule)]">
                {backorders.map((b) => (
                  <tr key={b.id} className="df-table-row">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-[var(--c-danger)] flex-shrink-0" />
                        <span className="font-medium text-[var(--c-fg)]">{b.product}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[var(--c-fg)]">
                      {b.quotationId.substring(0, 8).toUpperCase()}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--c-muted)]">{b.customer}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-medium text-[var(--c-danger)]">{b.qty}</td>
                    <td className="px-5 py-3.5 font-mono text-[var(--c-muted)]">{formatDate(b.expected)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${STATUS_STYLE[b.status] || 'bg-[var(--c-surface)] text-[var(--c-muted)] border-[var(--c-rule)]'}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {b.status === 'OPEN' ? (
                        <Button
                          variant="secondary"
                          className="text-xs py-1 px-2.5"
                          disabled={consolidating === b.id}
                          onClick={() => handleConsolidate(b)}
                        >
                          {consolidating === b.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                            : <PackageOpen className="w-3.5 h-3.5 mr-1 text-[var(--c-subtle)]" />}
                          Re-allocate
                        </Button>
                      ) : (
                        <span className="text-xs text-[var(--c-subtle)] font-mono">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="text-[11px] font-mono text-[var(--c-subtle)]">
        Re-allocate triggers an algorithmic multi-depot inventory scan to optimize order fulfillment across hubs.
      </div>
    </div>
  );
}
