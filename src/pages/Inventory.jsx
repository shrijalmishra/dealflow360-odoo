import React, { useState } from 'react';
import { Card } from '../components/common/UI';
import { Search } from 'lucide-react';

const MOCK_INVENTORY = [
  { product: 'Laptop',       warehouse: 'Mumbai WH',    available: 120, reserved: 20, backorder: 0  },
  { product: 'Laptop',       warehouse: 'Delhi WH',     available: 95,  reserved: 30, backorder: 6  },
  { product: 'Laptop',       warehouse: 'Bangalore WH', available: 30,  reserved: 10, backorder: 0  },
  { product: 'Cloud Pro',    warehouse: 'Mumbai WH',    available: 80,  reserved: 5,  backorder: 0  },
  { product: 'Cloud Pro',    warehouse: 'Bangalore WH', available: 50,  reserved: 18, backorder: 0  },
  { product: 'Setup Service',warehouse: 'Mumbai WH',    available: 60,  reserved: 15, backorder: 0  },
  { product: 'Setup Service',warehouse: 'Delhi WH',     available: 48,  reserved: 12, backorder: 0  },
  { product: 'Laptop Stand', warehouse: 'Mumbai WH',    available: 50,  reserved: 8,  backorder: 0  },
  { product: 'Laptop Stand', warehouse: 'Delhi WH',     available: 55,  reserved: 25, backorder: 10 },
  { product: 'Laptop Stand', warehouse: 'Bangalore WH', available: 10,  reserved: 3,  backorder: 0  },
];

export default function Inventory() {
  const [search, setSearch] = useState('');

  const filtered = MOCK_INVENTORY.filter(i =>
    i.product.toLowerCase().includes(search.toLowerCase()) ||
    i.warehouse.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <span className="text-sm text-gray-500">{filtered.length} records</span>
      </div>

      <div className="relative w-72">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search product or warehouse..."
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-5 py-3 text-left">Product</th>
              <th className="px-5 py-3 text-left">Warehouse</th>
              <th className="px-5 py-3 text-right">Available</th>
              <th className="px-5 py-3 text-right">Reserved</th>
              <th className="px-5 py-3 text-right">Backorder</th>
              <th className="px-5 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">{row.product}</td>
                <td className="px-5 py-3 text-gray-600">{row.warehouse}</td>
                <td className="px-5 py-3 text-right text-green-700 font-semibold">{row.available}</td>
                <td className="px-5 py-3 text-right text-amber-600 font-semibold">{row.reserved}</td>
                <td className="px-5 py-3 text-right">
                  {row.backorder > 0
                    ? <span className="font-bold text-red-600">{row.backorder}</span>
                    : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-5 py-3 text-right font-semibold text-gray-900">
                  {row.available + row.reserved + row.backorder}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-gray-400">No records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Legend */}
      <div className="flex gap-5 text-xs text-gray-500 pl-1">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-green-500 rounded-full" />Available — ready to ship</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-amber-400 rounded-full" />Reserved — allocated to orders</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-red-500 rounded-full" />Backorder — awaiting restock</span>
      </div>
    </div>
  );
}
