import React, { useState } from 'react';
import { Card } from '../components/common/UI';
import { formatDate } from '../utils/formatters';
import { AlertTriangle, CheckCircle, Loader2, PackageOpen } from 'lucide-react';

const INITIAL_BACKORDERS = [
  { id: 'bo1', product: 'Laptop',       order: 'O2', quoteNumber: 'Q-0995', warehouse: 'Delhi WH',    qty: 6,  expected: '2026-09-12T00:00:00Z', status: 'OPEN' },
  { id: 'bo2', product: 'Laptop Stand', order: 'O4', quoteNumber: 'Q-0972', warehouse: 'Delhi WH',    qty: 10, expected: '2026-09-15T00:00:00Z', status: 'OPEN' },
  { id: 'bo3', product: 'Laptop',       order: 'O2', quoteNumber: 'Q-0995', warehouse: 'Mumbai WH',   qty: 4,  expected: '2026-09-13T00:00:00Z', status: 'OPEN' },
];

const STATUS_STYLE = {
  OPEN:        'bg-red-50 text-red-700',
  CONSOLIDATING:'bg-amber-50 text-amber-700',
  RESOLVED:    'bg-green-50 text-green-700',
};

export default function Backorders() {
  const [backorders, setBackorders] = useState(INITIAL_BACKORDERS);
  const [consolidating, setConsolidating] = useState(null);

  const handleConsolidate = async (id) => {
    setConsolidating(id);
    await new Promise(r => setTimeout(r, 800)); // simulate API call
    setBackorders(prev =>
      prev.map(b => b.id === id ? { ...b, status: 'CONSOLIDATING' } : b)
    );
    setConsolidating(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Backorders</h1>
          <p className="text-sm text-gray-500 mt-1">Items awaiting restock across all warehouses</p>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
          backorders.filter(b => b.status === 'OPEN').length > 0
            ? 'bg-red-100 text-red-700'
            : 'bg-green-100 text-green-700'
        }`}>
          {backorders.filter(b => b.status === 'OPEN').length} Open
        </span>
      </div>

      {backorders.length === 0 && (
        <Card className="p-16 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="font-semibold text-gray-900">No backorders!</p>
          <p className="text-sm text-gray-500 mt-1">All stock is available.</p>
        </Card>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-5 py-3 text-left">Product</th>
              <th className="px-5 py-3 text-left">Order</th>
              <th className="px-5 py-3 text-left">Warehouse</th>
              <th className="px-5 py-3 text-right">Backorder Qty</th>
              <th className="px-5 py-3 text-left">Expected Date</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {backorders.map(b => (
              <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="font-medium text-gray-900">{b.product}</span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className="font-medium text-primary-600">{b.quoteNumber}</span>
                  <span className="text-gray-400 text-xs ml-1">({b.order})</span>
                </td>
                <td className="px-5 py-3 text-gray-700">{b.warehouse}</td>
                <td className="px-5 py-3 text-right font-bold text-red-600">{b.qty}</td>
                <td className="px-5 py-3 text-gray-700">{formatDate(b.expected)}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[b.status]}`}>
                    {b.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-center">
                  {b.status === 'OPEN' ? (
                    <button
                      onClick={() => handleConsolidate(b.id)}
                      disabled={consolidating === b.id}
                      className="flex items-center gap-1.5 mx-auto px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-xs font-semibold hover:bg-amber-100 disabled:opacity-50"
                    >
                      {consolidating === b.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <PackageOpen className="w-3 h-3" />}
                      Consolidate
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="text-xs text-gray-400 pl-1">
        Consolidate merges backorder quantities across warehouses to fulfil the order faster.
      </div>
    </div>
  );
}
