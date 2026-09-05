import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/common/UI';
import { formatMoney } from '../utils/formatters';
import {
  Truck, Package, AlertTriangle, CheckCircle,
  Warehouse, ClipboardList, Loader2, BarChart2,
  ArrowRight
} from 'lucide-react';

const MOCK_OPS_DASHBOARD = {
  activeOrders: 12,
  pendingShipments: 5,
  backorderItems: 3,
  warehouseUtilization: 74,
  recentOrders: [
    { id: 'o1', quoteNumber: 'Q-1001', customer: 'Acme Corp', items: 3, status: 'ALLOCATED', shipBy: '2026-09-10T00:00:00Z' },
    { id: 'o2', quoteNumber: 'Q-0995', customer: 'Beta Industries', items: 8, status: 'BACKORDERED', shipBy: '2026-09-08T00:00:00Z' },
    { id: 'o3', quoteNumber: 'Q-0988', customer: 'Gamma Ltd', items: 2, status: 'FULFILLED', shipBy: '2026-09-03T00:00:00Z' },
  ],
  backorders: [
    { product: 'Laptop', qty: 6, warehouse: 'Mumbai WH', expected: '2026-09-12T00:00:00Z' },
    { product: 'Laptop Stand', qty: 10, warehouse: 'Delhi WH', expected: '2026-09-15T00:00:00Z' },
  ],
  warehouseLoad: [
    { name: 'Mumbai WH', capacity: 500, used: 310, pending: 45 },
    { name: 'Delhi WH', capacity: 300, used: 198, pending: 60 },
    { name: 'Bangalore WH', capacity: 200, used: 90, pending: 12 },
  ],
};

const STATUS_STYLE = {
  ALLOCATED: 'bg-blue-50 text-blue-700',
  BACKORDERED: 'bg-red-50 text-red-700',
  FULFILLED: 'bg-green-50 text-green-700',
  PENDING: 'bg-amber-50 text-amber-700',
};

export default function OperationsDashboard() {
  const [data] = useState(MOCK_OPS_DASHBOARD);
  const navigate = useNavigate();

  const kpis = [
    { label: 'Active Orders', value: data.activeOrders, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Pending Shipments', value: data.pendingShipments, icon: Truck, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Backorder Items', value: data.backorderItems, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'WH Utilization', value: `${data.warehouseUtilization}%`, icon: Warehouse, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Operations Dashboard</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Card key={k.label} className="p-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${k.bg}`}>
                <k.icon className={`w-5 h-5 ${k.color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{k.label}</p>
                <p className="text-2xl font-bold text-gray-900">{k.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Orders */}
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-gray-500" /> Recent Orders
            </h2>
            <button onClick={() => navigate('/orders')} className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {data.recentOrders.map(order => (
              <div key={order.id} onClick={() => navigate(`/fulfillment/${order.id}`)}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 cursor-pointer">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{order.quoteNumber}</p>
                  <p className="text-xs text-gray-500">{order.customer} · {order.items} items</p>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[order.status] || 'bg-gray-100 text-gray-600'}`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Backorders */}
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" /> Backorders
            </h2>
            <button onClick={() => navigate('/backorders')} className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {data.backorders.map((b, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{b.product}</p>
                  <p className="text-xs text-gray-500">{b.warehouse}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-600">{b.qty} units</p>
                  <p className="text-xs text-gray-400">Expected {new Date(b.expected).toLocaleDateString('en-IN')}</p>
                </div>
              </div>
            ))}
            {data.backorders.length === 0 && (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">No backorders 🎉</div>
            )}
          </div>
        </Card>
      </div>

      {/* Warehouse Load */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-gray-500" /> Warehouse Load
          </h2>
          <button onClick={() => navigate('/warehouses')} className="text-xs text-primary-600 hover:underline flex items-center gap-1">
            Manage <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {data.warehouseLoad.map(wh => {
            const usedPct = Math.round((wh.used / wh.capacity) * 100);
            const pendingPct = Math.round((wh.pending / wh.capacity) * 100);
            return (
              <div key={wh.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-800">{wh.name}</span>
                  <span className="text-gray-500">{wh.used}/{wh.capacity} slots · <span className="text-amber-600">{wh.pending} pending</span></span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 flex overflow-hidden">
                  <div className="bg-primary-500 h-3" style={{ width: `${usedPct}%` }} />
                  <div className="bg-amber-300 h-3" style={{ width: `${pendingPct}%` }} />
                </div>
                <div className="flex gap-4 mt-1">
                  <span className="text-xs text-gray-500 flex items-center gap-1"><span className="w-2 h-2 bg-primary-500 rounded-full inline-block"></span> Used {usedPct}%</span>
                  <span className="text-xs text-gray-500 flex items-center gap-1"><span className="w-2 h-2 bg-amber-300 rounded-full inline-block"></span> Pending {pendingPct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
