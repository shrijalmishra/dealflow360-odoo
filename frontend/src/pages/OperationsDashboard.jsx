import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button } from '../components/common/UI';
import {
  Truck, Package, AlertTriangle, CheckCircle,
  Warehouse, ClipboardList, Loader2, BarChart2,
  ArrowRight, RefreshCw
} from 'lucide-react';
import api from '../services/api';
import { getWarehouses } from '../services/warehouseApi';

const STATUS_STYLE = {
  ALLOCATED:           'bg-[var(--c-info-bg)] text-[var(--c-info)] border-[var(--c-info-border)]',
  BACKORDERED:         'bg-[var(--c-danger-bg)] text-[var(--c-danger)] border-[var(--c-danger-border)]',
  FULFILLED:           'bg-[var(--c-success-bg)] text-[var(--c-success)] border-[var(--c-success-border)]',
  PENDING:             'bg-[var(--c-warning-bg)] text-[var(--c-warning)] border-[var(--c-warning-border)]',
  PARTIALLY_FULFILLED: 'bg-[var(--c-warning-bg)] text-[var(--c-warning)] border-[var(--c-warning-border)]',
  UNFULFILLED:         'bg-[var(--c-surface)] text-[var(--c-muted)] border-[var(--c-rule)]',
};

export default function OperationsDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const loadOpsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashRes, quotesRes, whRes] = await Promise.all([
        api.get('/reporting/dashboard').catch(() => ({})),
        api.get('/reporting/quotations').catch(() => ({ quotations: [] })),
        getWarehouses().catch(() => ({ data: [] })),
      ]);
      setDashboardData(dashRes.data || dashRes);
      const quotes = quotesRes.quotations || quotesRes.data?.quotations || [];
      setRecentOrders(quotes.slice(0, 6));
      setWarehouses(whRes.data || whRes.warehouses || []);
    } catch (err) {
      setError(err?.message || 'Failed to load operations metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOpsData(); }, []);

  const ful = dashboardData?.fulfillmentAndDelivery || {};
  const exec = dashboardData?.executiveSummary || {};
  const activeOrders   = exec.dealsWonCount || ful.totalFulfillments || 0;
  const pendingShipments = ful.statusCounts?.PENDING || 0;
  const backorderUnits   = ful.totalBackorderedUnits || ful.statusCounts?.BACKORDERED || 0;

  const totalAvailable = warehouses.reduce((sum, wh) =>
    sum + (wh.inventory || []).reduce((iSum, i) => iSum + (i.availableQty || 0), 0), 0);
  const totalReserved = warehouses.reduce((sum, wh) =>
    sum + (wh.inventory || []).reduce((iSum, i) => iSum + (i.reservedQty || 0), 0), 0);
  const totalStock = totalAvailable + totalReserved;
  const utilizationPct = totalStock > 0 ? Math.round((totalReserved / totalStock) * 100) : 0;

  const kpis = [
    { label: 'Active Pipeline Deals', value: activeOrders,       icon: ClipboardList  },
    { label: 'Pending Dispatches',    value: pendingShipments,   icon: Truck          },
    { label: 'Backorder Units',       value: backorderUnits,     icon: AlertTriangle  },
    { label: 'Depot Allocation',      value: `${utilizationPct}%`, icon: Warehouse    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-[var(--c-muted)] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin mb-2" />
        <p className="text-sm">Aggregating live operations and warehouse telemetry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--c-rule)]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--c-fg)]">Operations Command Center</h1>
          <p className="text-xs text-[var(--c-subtle)] mt-0.5">Depot inventory allocations, dispatch queues, and stock throughput</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={loadOpsData}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
          <span className="text-xs font-semibold px-2.5 py-1 bg-[var(--c-success-bg)] text-[var(--c-success)] border border-[var(--c-success-border)] rounded-full">
            Live
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-[var(--c-danger-bg)] border border-[var(--c-danger-border)] text-[var(--c-danger)] rounded-lg text-xs font-medium">
          {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="p-4 bg-[var(--c-surface)] border border-[var(--c-rule)] rounded-lg">
            <p className="text-[10px] font-semibold text-[var(--c-subtle)] uppercase tracking-wider mb-2">{k.label}</p>
            <p className="text-2xl font-extrabold text-[var(--c-fg)]">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card className="overflow-hidden">
          <div className="px-5 py-3.5 df-card-header flex items-center justify-between">
            <h2 className="font-semibold text-[var(--c-fg)] text-sm">Recent Active Orders</h2>
            <button
              onClick={() => navigate('/orders')}
              className="text-xs text-[var(--c-muted)] hover:text-[var(--c-fg)] font-medium flex items-center gap-1 transition-colors"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-[var(--c-rule)]">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => navigate(`/fulfillment/${order.id}`)}
                className="flex items-center justify-between px-5 py-3.5 df-table-row cursor-pointer"
              >
                <div>
                  <p className="font-bold text-[var(--c-fg)] text-xs font-mono">
                    {order.id.substring(0, 8).toUpperCase()}...
                  </p>
                  <p className="text-xs text-[var(--c-subtle)] mt-0.5">
                    {order.customerName} · <span className="text-[var(--c-subtle)]">Rep: {order.repName}</span>
                  </p>
                </div>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${STATUS_STYLE[order.fulfillmentStatus] || STATUS_STYLE.UNFULFILLED}`}>
                  {order.fulfillmentStatus || 'PENDING'}
                </span>
              </div>
            ))}
            {recentOrders.length === 0 && (
              <div className="px-5 py-12 text-center text-[var(--c-subtle)] text-xs">No orders in the pipeline.</div>
            )}
          </div>
        </Card>

        {/* Warehouse Status */}
        <Card className="overflow-hidden">
          <div className="px-5 py-3.5 df-card-header flex items-center justify-between">
            <h2 className="font-semibold text-[var(--c-fg)] text-sm">Depot Inventories & Utilization</h2>
            <button
              onClick={() => navigate('/warehouses')}
              className="text-xs text-[var(--c-muted)] hover:text-[var(--c-fg)] font-medium flex items-center gap-1 transition-colors"
            >
              Manage <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            {warehouses.map((wh) => {
              const whAvail = (wh.inventory || []).reduce((sum, i) => sum + (i.availableQty || 0), 0);
              const whRes   = (wh.inventory || []).reduce((sum, i) => sum + (i.reservedQty  || 0), 0);
              const whTot   = whAvail + whRes;
              const pct     = whTot > 0 ? Math.round((whRes / whTot) * 100) : 0;

              return (
                <div key={wh.id || wh.name}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold text-[var(--c-fg)]">{wh.name}</span>
                    <span className="text-[var(--c-subtle)]">
                      {whAvail} avail · <span className="text-[var(--c-warning)] font-bold">{whRes} reserved</span> (wt: {wh.shippingCostWeight})
                    </span>
                  </div>
                  <div className="w-full bg-[var(--c-surface)] border border-[var(--c-rule)] rounded-full h-2 overflow-hidden">
                    <div className="bg-[var(--c-fg)] h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {warehouses.length === 0 && (
              <p className="text-xs text-[var(--c-subtle)] text-center py-6">No depots registered.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
