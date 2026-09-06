import React, { useState, useEffect } from 'react';
import { Card, Button } from '../components/common/UI';
import { Search, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { getWarehouses } from '../services/warehouseApi';

export default function Inventory() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getWarehouses();
      const list = res.data || res.warehouses || [];
      setWarehouses(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.message || 'Failed to load warehouse inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const inventoryRows = [];
  warehouses.forEach((wh) => {
    (wh.inventory || []).forEach((inv) => {
      inventoryRows.push({
        id: inv.id,
        productId: inv.productId,
        product: inv.product?.name || 'Unknown Product',
        sku: inv.product?.sku || '',
        warehouse: wh.name,
        location: wh.location || 'Primary Depot',
        available: inv.availableQty || 0,
        reserved: inv.reservedQty || 0,
        reorderLevel: inv.reorderLevel || 0,
        total: (inv.availableQty || 0) + (inv.reservedQty || 0),
      });
    });
  });

  const filtered = inventoryRows.filter((i) =>
    i.product.toLowerCase().includes(search.toLowerCase()) ||
    i.warehouse.toLowerCase().includes(search.toLowerCase()) ||
    i.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--c-rule)]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--c-fg)]">Inventory Management</h1>
          <p className="text-xs text-[var(--c-subtle)] mt-0.5">Live stock availability, reservations, and reorder levels across depots</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <span className="text-xs font-semibold text-[var(--c-muted)] bg-[var(--c-surface)] border border-[var(--c-rule)] px-3 py-1.5 rounded-full">
            {filtered.length} SKUs
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-72">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--c-subtle)] pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search product, SKU, depot..."
          className="df-input w-full pl-9 pr-4 py-2 text-xs"
        />
      </div>

      {loading && (
        <Card className="p-16 flex flex-col items-center justify-center text-[var(--c-muted)]">
          <Loader2 className="w-8 h-8 animate-spin mb-3" />
          <p className="text-sm">Connecting to warehouse depots...</p>
        </Card>
      )}

      {error && !loading && (
        <div className="p-4 bg-[var(--c-danger-bg)] border border-[var(--c-danger-border)] text-[var(--c-danger)] rounded-lg flex items-center gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-[var(--c-subtle)] uppercase df-table-head">
                <tr>
                  <th className="px-5 py-3.5 text-left font-semibold tracking-wider">Product & SKU</th>
                  <th className="px-5 py-3.5 text-left font-semibold tracking-wider">Depot</th>
                  <th className="px-5 py-3.5 text-right font-semibold tracking-wider">Available</th>
                  <th className="px-5 py-3.5 text-right font-semibold tracking-wider">Reserved</th>
                  <th className="px-5 py-3.5 text-right font-semibold tracking-wider">Reorder Level</th>
                  <th className="px-5 py-3.5 text-right font-semibold tracking-wider">Total In Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--c-rule)]">
                {filtered.map((row) => (
                  <tr key={row.id} className="df-table-row">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-[var(--c-fg)] text-xs">{row.product}</p>
                      {row.sku && <p className="text-[10px] font-mono text-[var(--c-muted)] mt-0.5">{row.sku}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-[var(--c-fg)] font-medium text-xs">{row.warehouse}</p>
                      <p className="text-[10px] text-[var(--c-subtle)]">{row.location}</p>
                    </td>
                    <td className="px-5 py-3.5 text-right text-[var(--c-success)] font-bold text-xs">{row.available}</td>
                    <td className="px-5 py-3.5 text-right text-[var(--c-warning)] font-bold text-xs">{row.reserved}</td>
                    <td className="px-5 py-3.5 text-right text-[var(--c-subtle)] text-xs">{row.reorderLevel}</td>
                    <td className="px-5 py-3.5 text-right font-extrabold text-[var(--c-fg)] text-xs">{row.total}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-[var(--c-subtle)] text-xs">
                      No matching inventory items found across warehouses.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Legend */}
      <div className="flex gap-6 text-xs text-[var(--c-subtle)] pl-1">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[var(--c-success)]" />
          Available — ready to allocate
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[var(--c-warning)]" />
          Reserved — committed to approved quotes
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[var(--c-rule)]" />
          Reorder Level — threshold for restocking
        </span>
      </div>
    </div>
  );
}
