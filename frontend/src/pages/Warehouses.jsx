import React, { useState, useEffect } from 'react';
import { getWarehouses } from '../services/warehouseApi';
import { Card, Button, Badge } from '../components/common/UI';
import { Warehouse, Loader2, AlertTriangle, Package, MapPin, RefreshCw } from 'lucide-react';

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWh = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getWarehouses();
      const list = res.warehouses || res.data?.warehouses || (Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []));
      setWarehouses(list);
    } catch (err) {
      setError(err?.error?.message || err?.message || 'Failed to load warehouses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWh(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full space-x-3 text-[var(--c-muted)]">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading logistics depots...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <AlertTriangle className="w-10 h-10 text-[var(--c-danger)]" />
        <p className="text-[var(--c-danger)] text-sm">{error}</p>
        <Button variant="outline" onClick={fetchWh}>
          <RefreshCw className="w-4 h-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--c-rule)]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--c-fg)]">Warehouses & Logistics Depots</h1>
          <p className="text-xs text-[var(--c-subtle)] mt-0.5">Physical fulfillment centers and stock allocation nodes</p>
        </div>
        <Button variant="outline" onClick={fetchWh}>
          <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {warehouses.map((wh) => {
          const invList = wh.inventory || [];
          const totalUnits = invList.reduce((sum, item) => sum + (item.quantity || 0), 0);
          const reservedUnits = invList.reduce((sum, item) => sum + (item.reservedQty || 0), 0);
          const availableUnits = totalUnits - reservedUnits;

          return (
            <Card key={wh.id} className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[var(--c-surface)] border border-[var(--c-rule)] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Warehouse className="w-5 h-5 text-[var(--c-muted)]" />
                  </div>
                  <div>
                    <h2 className="font-bold text-[var(--c-fg)] text-sm">{wh.name}</h2>
                    <p className="text-xs text-[var(--c-subtle)] flex items-center mt-0.5">
                      <MapPin className="w-3 h-3 mr-1" /> {wh.location || 'Hub Location'}
                    </p>
                  </div>
                </div>
                <Badge variant="default">Weight: {wh.shippingCostWeight || 1.0}x</Badge>
              </div>

              {/* STATS ROW */}
              <div className="grid grid-cols-3 gap-2 text-center py-3 px-2 bg-[var(--c-surface)] border border-[var(--c-rule)] rounded-lg text-xs">
                <div>
                  <span className="text-[var(--c-subtle)] block text-[10px] uppercase font-semibold mb-0.5">Total</span>
                  <span className="font-extrabold text-[var(--c-fg)] text-sm">{totalUnits}</span>
                </div>
                <div>
                  <span className="text-[var(--c-subtle)] block text-[10px] uppercase font-semibold mb-0.5">Reserved</span>
                  <span className="font-extrabold text-[var(--c-warning)] text-sm">{reservedUnits}</span>
                </div>
                <div>
                  <span className="text-[var(--c-subtle)] block text-[10px] uppercase font-semibold mb-0.5">Available</span>
                  <span className="font-extrabold text-[var(--c-success)] text-sm">{availableUnits}</span>
                </div>
              </div>

              {/* STOCK BREAKDOWN */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--c-subtle)] mb-2.5 flex items-center">
                  <Package className="w-3.5 h-3.5 mr-1.5" /> On-Hand SKU Inventory
                </p>
                {invList.length === 0 ? (
                  <p className="text-xs text-[var(--c-subtle)] italic py-3 text-center">No inventory assigned to this depot</p>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {invList.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-[var(--c-rule)] last:border-0">
                        <span className="text-[var(--c-muted)] font-medium truncate max-w-[150px]">{item.product?.name || 'Product SKU'}</span>
                        <div className="space-x-2 text-right flex-shrink-0">
                          <span className="font-bold text-[var(--c-fg)]">{item.quantity} units</span>
                          {item.reservedQty > 0 && (
                            <span className="text-[var(--c-warning)] font-medium">({item.reservedQty} res)</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          );
        })}

        {warehouses.length === 0 && (
          <div className="col-span-3 py-16 text-center text-[var(--c-subtle)] text-sm">
            <Warehouse className="w-10 h-10 mx-auto opacity-20 mb-2" />
            <p>No warehouse depots registered.</p>
          </div>
        )}
      </div>
    </div>
  );
}
