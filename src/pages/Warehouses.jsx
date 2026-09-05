import React from 'react';
import { Card } from '../components/common/UI';
import { Warehouse } from 'lucide-react';

const MOCK_WAREHOUSES = [
  {
    id: 'wh1',
    name: 'Mumbai WH',
    location: 'Mumbai, MH',
    capacity: 500,
    used: 310,
    pending: 45,
    stock: [
      { product: 'Laptop',       qty: 120 },
      { product: 'Cloud Pro',    qty: 80  },
      { product: 'Setup Service',qty: 60  },
      { product: 'Laptop Stand', qty: 50  },
    ],
  },
  {
    id: 'wh2',
    name: 'Delhi WH',
    location: 'New Delhi, DL',
    capacity: 300,
    used: 198,
    pending: 60,
    stock: [
      { product: 'Laptop',       qty: 95  },
      { product: 'Laptop Stand', qty: 55  },
      { product: 'Setup Service',qty: 48  },
    ],
  },
  {
    id: 'wh3',
    name: 'Bangalore WH',
    location: 'Bangalore, KA',
    capacity: 200,
    used: 90,
    pending: 12,
    stock: [
      { product: 'Cloud Pro',    qty: 50  },
      { product: 'Laptop',       qty: 30  },
      { product: 'Laptop Stand', qty: 10  },
    ],
  },
];

export default function Warehouses() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Warehouses</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {MOCK_WAREHOUSES.map(wh => {
          const usedPct   = Math.round((wh.used    / wh.capacity) * 100);
          const pendingPct = Math.round((wh.pending / wh.capacity) * 100);
          const free = wh.capacity - wh.used - wh.pending;

          return (
            <Card key={wh.id} className="p-5 space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                  <Warehouse className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{wh.name}</p>
                  <p className="text-xs text-gray-500">{wh.location}</p>
                </div>
              </div>

              {/* Capacity bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Utilization</span>
                  <span>{usedPct}% used</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 flex overflow-hidden">
                  <div className="bg-primary-500 h-3 transition-all" style={{ width: `${usedPct}%` }} />
                  <div className="bg-amber-300 h-3 transition-all" style={{ width: `${pendingPct}%` }} />
                </div>
                <div className="flex gap-3 mt-1.5 text-xs">
                  <span className="flex items-center gap-1 text-gray-500">
                    <span className="w-2 h-2 bg-primary-500 rounded-full inline-block" />Used: {wh.used}
                  </span>
                  <span className="flex items-center gap-1 text-amber-600">
                    <span className="w-2 h-2 bg-amber-300 rounded-full inline-block" />Pending: {wh.pending}
                  </span>
                  <span className="flex items-center gap-1 text-green-600">
                    <span className="w-2 h-2 bg-green-300 rounded-full inline-block" />Free: {free}
                  </span>
                </div>
              </div>

              {/* Stock summary */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Stock Summary</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="pb-1 text-left font-normal">Product</th>
                      <th className="pb-1 text-right font-normal">Units</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wh.stock.map((s, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-1.5 text-gray-700">{s.product}</td>
                        <td className="py-1.5 text-right font-semibold text-gray-900">{s.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
