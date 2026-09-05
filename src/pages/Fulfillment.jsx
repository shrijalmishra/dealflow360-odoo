import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getRecommendation, acceptSplit, consolidateBackorder } from '../services/fulfillmentApi';
import { Card, Button, Badge, StatusBadge } from '../components/common/UI';
import { formatMoney } from '../utils/formatters';
import { Warehouse, Truck, Package, AlertTriangle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';

export default function Fulfillment() {
  const { orderId } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [consolidating, setConsolidating] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const oId = orderId || 'o1';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getRecommendation(oId);
        setData(res.data);
      } catch (err) {
        setError(err?.error?.message || 'Failed to load fulfillment data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [oId]);

  const handleAccept = async () => {
    try {
      setAccepting(true);
      await acceptSplit(oId, { split: data.split });
      setAccepted(true);
    } catch (err) {
      console.error('Accept failed:', err);
    } finally {
      setAccepting(false);
    }
  };

  const handleConsolidate = async () => {
    try {
      setConsolidating(true);
      await consolidateBackorder(oId);
      // Refresh
      const res = await getRecommendation(oId);
      setData(res.data);
    } catch (err) {
      console.error('Consolidation failed:', err);
    } finally {
      setConsolidating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400 mr-3" />
        <p className="text-gray-500">Loading fulfillment data...</p>
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

  const hasBackorder = data.backorderQuantity > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fulfillment</h1>
          <p className="text-sm text-gray-500 mt-1">Order: {oId}</p>
        </div>
        {accepted && (
          <Badge variant="success">
            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Split Accepted
          </Badge>
        )}
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Shipment Count</p>
              <p className="text-2xl font-bold text-gray-900">{data.shipmentCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Shipping Cost</p>
              <p className="text-2xl font-bold text-gray-900">{formatMoney(data.totalShippingCost)}</p>
            </div>
          </div>
        </Card>
        <Card className={`p-5 ${hasBackorder ? 'border-amber-300 bg-amber-50/50' : ''}`}>
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${hasBackorder ? 'bg-amber-100' : 'bg-gray-100'}`}>
              <AlertTriangle className={`w-5 h-5 ${hasBackorder ? 'text-amber-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Backorder Quantity</p>
              <p className={`text-2xl font-bold ${hasBackorder ? 'text-amber-700' : 'text-gray-900'}`}>{data.backorderQuantity}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* WAREHOUSE SPLIT TABLE */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center">
            <Warehouse className="w-4 h-4 mr-2 text-gray-500" />
            Recommended Warehouse Split
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b">
            <tr>
              <th className="px-6 py-3 text-left">Warehouse</th>
              <th className="px-6 py-3 text-center">Quantity</th>
              <th className="px-6 py-3 text-right">Shipping Cost</th>
              <th className="px-6 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.split.map((row, idx) => (
              <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50">
                <td className="px-6 py-4 font-medium text-gray-900">{row.warehouse}</td>
                <td className="px-6 py-4 text-center">{row.quantity}</td>
                <td className="px-6 py-4 text-right">{formatMoney(row.shippingCost)}</td>
                <td className="px-6 py-4 text-center">
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* BACKORDER ALERT */}
      {hasBackorder && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-amber-500 mr-3 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-800">Remaining Backorder</p>
              <p className="text-sm text-amber-600">{data.backorderQuantity} unit(s) are on backorder and awaiting stock.</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleConsolidate} disabled={consolidating}>
            {consolidating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Consolidate Remaining Backorder
          </Button>
        </div>
      )}

      {/* ACTION BUTTONS */}
      <div className="flex items-center space-x-3">
        <Button variant="primary" onClick={handleAccept} disabled={accepting || accepted}>
          {accepting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
          {accepted ? 'Split Accepted' : 'Accept Suggested Split'}
        </Button>
        <Button variant="outline">
          Manual Override
        </Button>
      </div>
    </div>
  );
}
