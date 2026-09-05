import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard } from '../services/dashboardApi';
import { Card, Button, Badge, StatusBadge } from '../components/common/UI';
import { formatMoney, formatDate } from '../utils/formatters';
import {
  FileText, Clock, AlertTriangle, TrendingUp, 
  CreditCard, Truck, Loader2, ExternalLink
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getDashboard();
        setData(res.data);
      } catch (err) {
        setError(err?.error?.message || 'Failed to load dashboard.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400 mr-3" />
        <p className="text-gray-500">Loading dashboard...</p>
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

  const kpis = [
    { label: 'Total Quotations', value: data.totalQuotations, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Pending Approvals', value: data.pendingApprovals, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'At-Risk Deals', value: data.atRiskDeals, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Revenue', value: formatMoney(data.revenue), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Outstanding Payments', value: formatMoney(data.outstandingPayments), icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Fulfillment Issues', value: data.fulfillmentIssues, icon: Truck, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="p-4">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 ${kpi.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 truncate">{kpi.label}</p>
                <p className="text-lg font-bold text-gray-900">{kpi.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ALERT TABLES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* STALLED DEALS */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center">
            <Clock className="w-4 h-4 mr-2 text-amber-500" />
            <h2 className="font-semibold text-gray-900 text-sm">Stalled Deals</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {data.stalledDeals.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 text-center">No stalled deals.</p>
            ) : (
              data.stalledDeals.map((deal, idx) => (
                <div
                  key={idx}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/quotations/${deal.quoteNumber}`)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-gray-900">{deal.quoteNumber}</span>
                    <StatusBadge status={deal.status} />
                  </div>
                  <p className="text-xs text-gray-500">{deal.customer}</p>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-gray-400">Inactive: {deal.inactivity}</span>
                    <span className="font-medium text-gray-700">{formatMoney(deal.amount)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* DISCOUNT ANOMALIES */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
            <h2 className="font-semibold text-gray-900 text-sm">Discount Anomalies</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {data.discountAnomalies.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 text-center">No anomalies detected.</p>
            ) : (
              data.discountAnomalies.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/quotations/${item.quoteNumber}`)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-gray-900">{item.quoteNumber}</span>
                    <Badge variant={item.severity === 'HIGH' ? 'danger' : 'warning'}>{item.severity}</Badge>
                  </div>
                  <p className="text-xs text-gray-500">Rep: {item.rep}</p>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-red-600 font-medium">Discount: {item.discount}</span>
                    <span className="text-gray-400">Avg: {item.historicalAverage}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* DELIVERY SLIPPAGE */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center">
            <Truck className="w-4 h-4 mr-2 text-orange-500" />
            <h2 className="font-semibold text-gray-900 text-sm">Delivery Slippage</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {data.deliverySlippage.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 text-center">All deliveries on track.</p>
            ) : (
              data.deliverySlippage.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/fulfillment/${item.orderId}`)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-gray-900">{item.orderId}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-gray-500">Expected: {formatDate(item.expected)}</span>
                    <span className="text-red-600 font-medium">{item.actualStatus}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
