import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getBilling, submitPayment } from '../services/billingApi';
import { Card, Button, Badge, StatusBadge } from '../components/common/UI';
import { formatMoney, formatDate } from '../utils/formatters';
import { CreditCard, Receipt, CalendarDays, AlertTriangle, CheckCircle, Loader2, Ban, Edit } from 'lucide-react';

export default function Billing() {
  const { orderId } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  const oId = orderId || 'o1';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getBilling(oId);
        setData(res.data);
      } catch (err) {
        setError(err?.error?.message || 'Failed to load billing data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [oId]);

  const handlePay = async () => {
    try {
      setPaying(true);
      await submitPayment(oId, { amount: data.remaining });
      setPaid(true);
    } catch (err) {
      console.error('Payment failed:', err);
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400 mr-3" />
        <p className="text-gray-500">Loading billing data...</p>
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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Subscriptions</h1>
          <p className="text-sm text-gray-500 mt-1">Order: {oId}</p>
        </div>
        <StatusBadge status={paid ? 'PAID' : data.invoiceStatus} />
      </div>

      {/* FINANCIAL SUMMARY */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-5">
          <p className="text-xs text-gray-500 mb-1">Total</p>
          <p className="text-xl font-bold text-gray-900">{formatMoney(data.total)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-gray-500 mb-1">Paid</p>
          <p className="text-xl font-bold text-green-700">{formatMoney(paid ? data.total : data.paid)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-gray-500 mb-1">Remaining</p>
          <p className="text-xl font-bold text-amber-700">{formatMoney(paid ? 0 : data.remaining)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-gray-500 mb-1">Invoice Status</p>
          <p className="text-xl font-bold text-gray-900">{paid ? 'Paid' : data.invoiceStatus.replace(/_/g, ' ')}</p>
        </Card>
      </div>

      {/* ONE-TIME PRODUCTS */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center">
          <Receipt className="w-4 h-4 mr-2 text-gray-500" />
          <h2 className="font-semibold text-gray-900">One-Time Products</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b">
            <tr>
              <th className="px-6 py-3 text-left">Product</th>
              <th className="px-6 py-3 text-center">Qty</th>
              <th className="px-6 py-3 text-right">Amount</th>
              <th className="px-6 py-3 text-center">Billing Date</th>
              <th className="px-6 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.oneTime.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50">
                <td className="px-6 py-4 font-medium text-gray-900">{item.product}</td>
                <td className="px-6 py-4 text-center">{item.quantity}</td>
                <td className="px-6 py-4 text-right">{formatMoney(item.amount)}</td>
                <td className="px-6 py-4 text-center text-gray-600">{formatDate(item.billingDate)}</td>
                <td className="px-6 py-4 text-center">
                  <StatusBadge status={paid ? 'PAID' : item.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* RECURRING PRODUCTS */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center">
            <CalendarDays className="w-4 h-4 mr-2 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Recurring Subscriptions</h2>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" className="text-xs py-1 px-3">
              <Edit className="w-3.5 h-3.5 mr-1" /> Modify
            </Button>
            <Button variant="outline" className="text-xs py-1 px-3 text-red-600 border-red-200 hover:bg-red-50">
              <Ban className="w-3.5 h-3.5 mr-1" /> Cancel
            </Button>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b">
            <tr>
              <th className="px-6 py-3 text-left">Product</th>
              <th className="px-6 py-3 text-center">Qty</th>
              <th className="px-6 py-3 text-right">Amount / Cycle</th>
              <th className="px-6 py-3 text-center">Next Billing</th>
              <th className="px-6 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.recurring.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                  No recurring subscriptions.
                </td>
              </tr>
            ) : (
              data.recurring.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-medium text-gray-900">{item.product}</td>
                  <td className="px-6 py-4 text-center">{item.quantity}</td>
                  <td className="px-6 py-4 text-right">{formatMoney(item.amount)}</td>
                  <td className="px-6 py-4 text-center text-gray-600">{formatDate(item.billingDate)}</td>
                  <td className="px-6 py-4 text-center">
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* PAYMENT ACTION */}
      <Card className="p-6 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Make Payment</h3>
          <p className="text-sm text-gray-500 mt-1">
            {paid ? 'All payments have been received.' : `Outstanding balance: ${formatMoney(data.remaining)}`}
          </p>
        </div>
        <Button variant="primary" onClick={handlePay} disabled={paying || paid}>
          {paying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
          {paid ? 'Payment Complete' : `Pay ${formatMoney(data.remaining)}`}
        </Button>
      </Card>
    </div>
  );
}
