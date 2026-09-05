import React, { useState, useEffect } from 'react';
import { getReports } from '../services/reportApi';
import { Card, Button, Badge } from '../components/common/UI';
import { formatMoney, formatPercent } from '../utils/formatters';
import { 
  BarChart2, Download, FileText, ShoppingCart, 
  TrendingUp, Percent, CheckCircle, XCircle,
  Clock, RotateCcw, Loader2, AlertTriangle
} from 'lucide-react';

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [period, setPeriod] = useState('last_30_days');
  const [rep, setRep] = useState('');
  const [approvalStatus, setApprovalStatus] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getReports({ period, rep, approvalStatus, category });
        setData(res.data);
      } catch (err) {
        setError(err?.error?.message || 'Failed to load reports.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period, rep, approvalStatus, category]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400 mr-3" />
        <p className="text-gray-500">Loading reports...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <AlertTriangle className="w-10 h-10 text-red-400" />
        <p className="text-red-600">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (!data) return null;

  const approvalTotal = data.approvalStats.approved + data.approvalStats.rejected + data.approvalStats.pending + data.approvalStats.returned;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" /> Export PDF
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" /> Export XLS
          </Button>
        </div>
      </div>

      {/* FILTERS */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Period</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500">
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="last_90_days">Last 90 Days</option>
              <option value="last_year">Last Year</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Sales Rep</label>
            <select value={rep} onChange={(e) => setRep(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500">
              <option value="">All Reps</option>
              <option value="sarah">Sarah Sales</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Approval Status</label>
            <select value={approvalStatus} onChange={(e) => setApprovalStatus(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500">
              <option value="">All</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500">
              <option value="">All Categories</option>
              <option value="hardware">Hardware</option>
              <option value="services">Services</option>
              <option value="subscriptions">Subscriptions</option>
            </select>
          </div>
        </div>
      </Card>

      {/* KPI ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Quotations</p>
              <p className="text-2xl font-bold text-gray-900">{data.quotationCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Orders</p>
              <p className="text-2xl font-bold text-gray-900">{data.orderCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatMoney(data.revenue)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <Percent className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Avg Discount</p>
              <p className="text-2xl font-bold text-gray-900">{formatPercent(data.averageDiscount)}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* APPROVAL STATS */}
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm flex items-center">
              <BarChart2 className="w-4 h-4 mr-2 text-gray-500" /> Approval Statistics
            </h2>
          </div>
          <div className="p-6 space-y-4">
            {[
              { label: 'Approved', count: data.approvalStats.approved, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500' },
              { label: 'Rejected', count: data.approvalStats.rejected, icon: XCircle, color: 'text-red-500', bg: 'bg-red-500' },
              { label: 'Pending', count: data.approvalStats.pending, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500' },
              { label: 'Returned', count: data.approvalStats.returned, icon: RotateCcw, color: 'text-purple-500', bg: 'bg-purple-500' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center space-x-3">
                <stat.icon className={`w-4 h-4 ${stat.color} flex-shrink-0`} />
                <span className="text-sm text-gray-700 w-20">{stat.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                  <div className={`${stat.bg} h-2.5 rounded-full`} style={{ width: `${approvalTotal > 0 ? (stat.count / approvalTotal) * 100 : 0}%` }}></div>
                </div>
                <span className="text-sm font-bold text-gray-900 w-8 text-right">{stat.count}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* TOP PRODUCTS */}
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm flex items-center">
              <ShoppingCart className="w-4 h-4 mr-2 text-gray-500" /> Top Products
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b">
              <tr>
                <th className="px-6 py-3 text-left">#</th>
                <th className="px-6 py-3 text-left">Product</th>
                <th className="px-6 py-3 text-center">Units Sold</th>
                <th className="px-6 py-3 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.topProducts.map((p, idx) => (
                <tr key={p.name} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-6 py-3 text-gray-400 font-medium">{idx + 1}</td>
                  <td className="px-6 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-6 py-3 text-center">{p.unitsSold}</td>
                  <td className="px-6 py-3 text-right font-medium text-gray-900">{formatMoney(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
