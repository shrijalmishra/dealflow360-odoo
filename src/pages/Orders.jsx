import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/common/UI';
import { formatMoney, formatDate } from '../utils/formatters';
import { ClipboardList, Search, ChevronRight } from 'lucide-react';

const MOCK_ORDERS = [
  { id: 'o1', quoteNumber: 'Q-1001', customer: 'Acme Corp',       items: 3, orderStatus: 'CONFIRMED',   fulfillmentStatus: 'ALLOCATED',           total: 197400, created: '2026-09-04T10:00:00Z' },
  { id: 'o2', quoteNumber: 'Q-0995', customer: 'Beta Industries',  items: 8, orderStatus: 'CONFIRMED',   fulfillmentStatus: 'BACKORDERED',          total: 450000, created: '2026-09-03T14:00:00Z' },
  { id: 'o3', quoteNumber: 'Q-0988', customer: 'Gamma Ltd',        items: 2, orderStatus: 'FULFILLED',   fulfillmentStatus: 'FULFILLED',            total: 88000,  created: '2026-09-02T09:00:00Z' },
  { id: 'o4', quoteNumber: 'Q-0972', customer: 'Delta Corp',       items: 5, orderStatus: 'CONFIRMED',   fulfillmentStatus: 'PARTIALLY_ALLOCATED',  total: 320000, created: '2026-09-01T11:00:00Z' },
  { id: 'o5', quoteNumber: 'Q-0961', customer: 'Epsilon Inc',      items: 1, orderStatus: 'CANCELLED',   fulfillmentStatus: 'PENDING',              total: 50000,  created: '2026-08-29T08:00:00Z' },
];

const STATUS_STYLE = {
  CONFIRMED:          'bg-blue-50 text-blue-700',
  FULFILLED:          'bg-green-50 text-green-700',
  CANCELLED:          'bg-gray-100 text-gray-500',
};
const FUL_STYLE = {
  ALLOCATED:          'bg-blue-50 text-blue-700',
  BACKORDERED:        'bg-red-50 text-red-700',
  FULFILLED:          'bg-green-50 text-green-700',
  PARTIALLY_ALLOCATED:'bg-amber-50 text-amber-700',
  PENDING:            'bg-gray-100 text-gray-500',
};

export default function Orders() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = MOCK_ORDERS.filter(o =>
    o.quoteNumber.toLowerCase().includes(search.toLowerCase()) ||
    o.customer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <span className="text-sm text-gray-500">{filtered.length} orders</span>
      </div>

      {/* Search */}
      <div className="relative w-72">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by order or customer..."
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-5 py-3 text-left">Order ID</th>
              <th className="px-5 py-3 text-left">Quote</th>
              <th className="px-5 py-3 text-left">Customer</th>
              <th className="px-5 py-3 text-center">Items</th>
              <th className="px-5 py-3 text-left">Order Status</th>
              <th className="px-5 py-3 text-left">Fulfillment</th>
              <th className="px-5 py-3 text-right">Total</th>
              <th className="px-5 py-3 text-left">Created</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(order => (
              <tr
                key={order.id}
                onClick={() => navigate(`/fulfillment/${order.id}`)}
                className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-5 py-3 font-mono font-medium text-gray-900">{order.id.toUpperCase()}</td>
                <td className="px-5 py-3 font-medium text-primary-600">{order.quoteNumber}</td>
                <td className="px-5 py-3 text-gray-700">{order.customer}</td>
                <td className="px-5 py-3 text-center text-gray-700">{order.items}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[order.orderStatus] || 'bg-gray-100 text-gray-500'}`}>
                    {order.orderStatus}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${FUL_STYLE[order.fulfillmentStatus] || 'bg-gray-100 text-gray-500'}`}>
                    {order.fulfillmentStatus.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-5 py-3 text-right font-medium text-gray-900">{formatMoney(order.total)}</td>
                <td className="px-5 py-3 text-gray-500">{formatDate(order.created)}</td>
                <td className="px-5 py-3"><ChevronRight className="w-4 h-4 text-gray-400" /></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-gray-400">No orders found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
