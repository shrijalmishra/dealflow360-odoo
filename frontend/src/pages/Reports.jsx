import React, { useState, useEffect } from 'react';
import { getReports, exportQuotationsCSV, exportQuotationsXLS, exportQuotationsPDF } from '../services/reportApi';
import { Card, Button } from '../components/common/UI';
import { formatMoney, formatPercent } from '../utils/formatters';
import {
  Download, FileText, ShoppingCart,
  TrendingUp, Percent, CheckCircle, XCircle,
  Clock, RotateCcw, Loader2, AlertTriangle, RefreshCw
} from 'lucide-react';

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');

  const user = JSON.parse(localStorage.getItem('dealflow_user') || '{}');
  const canExport = ['ADMIN', 'SALES_MANAGER', 'FINANCE_OPS'].includes(user.role);

  const [period, setPeriod] = useState('last_30_days');
  const [rep, setRep] = useState('');
  const [approvalStatus, setApprovalStatus] = useState('');
  const [category, setCategory] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getReports({ period, rep, approvalStatus, category });
      setData(res.data);
    } catch (err) {
      setError(err?.error?.message || err?.message || 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [period, rep, approvalStatus, category]);

  const handleExportCSV = async () => {
    if (!canExport) { alert('Export is restricted to Admin, Sales Manager, and Finance Ops roles.'); return; }
    try {
      setExporting(true);
      setExportMessage('');
      await exportQuotationsCSV();
      setExportMessage('CSV report exported successfully.');
      setTimeout(() => setExportMessage(''), 4000);
    } catch (err) {
      alert(err.message || 'Failed to export CSV.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportXLS = async () => {
    if (!canExport) { alert('Export is restricted to Admin, Sales Manager, and Finance Ops roles.'); return; }
    try {
      setExporting(true);
      setExportMessage('');
      await exportQuotationsXLS();
      setExportMessage('Excel (XLS) report exported successfully.');
      setTimeout(() => setExportMessage(''), 4000);
    } catch (err) {
      alert(err.message || 'Failed to export XLS.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!canExport) { alert('Export is restricted to Admin, Sales Manager, and Finance Ops roles.'); return; }
    try {
      setExporting(true);
      setExportMessage('');
      await exportQuotationsPDF();
      setExportMessage('PDF report exported successfully.');
      setTimeout(() => setExportMessage(''), 4000);
    } catch (err) {
      alert(err.message || 'Failed to export PDF.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full p-20 space-x-3 text-[var(--c-muted)]">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm">Compiling business performance telemetry...</span>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-full space-y-4 p-12">
      <AlertTriangle className="w-10 h-10 text-[var(--c-danger)]" />
      <p className="text-[var(--c-danger)] text-sm">{error}</p>
      <Button variant="outline" onClick={fetchData}><RefreshCw className="w-4 h-4 mr-2" /> Retry</Button>
    </div>
  );

  if (!data) return null;

  const approvalTotal = data.approvalStats.approved + data.approvalStats.rejected + data.approvalStats.pending + data.approvalStats.returned;

  const selectClass = 'df-input px-3 py-1.5 text-xs';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--c-rule)]">
        <div>
          <span className="text-[10px] font-mono text-[var(--c-subtle)] uppercase tracking-wider block mb-1">
            Governance / Telemetry
          </span>
          <h1 className="text-xl font-bold tracking-tight text-[var(--c-fg)]">Reports & Executive Analytics</h1>
          <p className="text-xs text-[var(--c-subtle)] mt-0.5">Authoritative governance metrics from live quotation lifecycle</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportPDF}
            disabled={exporting}
            className={`text-xs py-1.5 px-3 font-mono ${!canExport ? 'opacity-60 cursor-not-allowed' : ''}`}
            title={!canExport ? 'Restricted to Manager/Finance/Admin' : 'Export Executive PDF Report'}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" /> PDF
          </Button>
          <Button
            variant="outline"
            onClick={handleExportXLS}
            disabled={exporting}
            className={`text-xs py-1.5 px-3 font-mono ${!canExport ? 'opacity-60 cursor-not-allowed' : ''}`}
            title={!canExport ? 'Restricted to Manager/Finance/Admin' : 'Export Excel Spreadsheet'}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" /> XLS
          </Button>
          <Button
            variant="primary"
            onClick={handleExportCSV}
            disabled={exporting}
            className={`text-xs py-1.5 px-3 font-mono ${!canExport ? 'opacity-60 cursor-not-allowed' : ''}`}
            title={!canExport ? 'Restricted to Manager/Finance/Admin' : 'Export Raw CSV'}
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
            CSV
          </Button>
        </div>
      </div>

      {exportMessage && (
        <div className="p-3.5 bg-[var(--c-success-bg)] border border-[var(--c-success-border)] text-[var(--c-success)] rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {exportMessage}
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--c-subtle)] mb-1.5">Period</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className={selectClass}>
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="last_90_days">Last 90 Days</option>
              <option value="last_year">Last Year</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--c-subtle)] mb-1.5">Sales Rep</label>
            <select value={rep} onChange={(e) => setRep(e.target.value)} className={selectClass}>
              <option value="">All Reps</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--c-subtle)] mb-1.5">Approval Status</label>
            <select value={approvalStatus} onChange={(e) => setApprovalStatus(e.target.value)} className={selectClass}>
              <option value="">All Statuses</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--c-subtle)] mb-1.5">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
              <option value="">All Categories</option>
              <option value="hardware">Hardware</option>
              <option value="services">Services</option>
              <option value="subscriptions">Subscriptions</option>
            </select>
          </div>
        </div>
      </Card>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Quotations',       value: data.quotationCount,              icon: FileText,      color: '' },
          { label: 'Deals Won',        value: data.orderCount,                  icon: ShoppingCart,  color: 'text-[var(--c-success)]' },
          { label: 'Realized Revenue', value: formatMoney(data.revenue),        icon: TrendingUp,    color: '' },
          { label: 'Avg Discount',     value: formatPercent(data.averageDiscount), icon: Percent,    color: 'text-[var(--c-warning)]' },
        ].map((k) => (
          <div key={k.label} className="p-4 bg-[var(--c-surface)] border border-[var(--c-rule)] rounded-lg">
            <p className="text-[10px] font-semibold text-[var(--c-subtle)] uppercase tracking-wider mb-2">{k.label}</p>
            <p className={`text-2xl font-extrabold ${k.color || 'text-[var(--c-fg)]'}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Approval Breakdown */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-[var(--c-fg)] text-sm">Approval Breakdown</h2>
            <span className="text-xs font-semibold text-[var(--c-subtle)] bg-[var(--c-surface)] border border-[var(--c-rule)] px-2.5 py-0.5 rounded-full">
              {approvalTotal} total
            </span>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Approved', count: data.approvalStats.approved,  icon: CheckCircle, color: 'text-emerald-400', bar: 'bg-emerald-500' },
              { label: 'Rejected', count: data.approvalStats.rejected,  icon: XCircle,     color: 'text-rose-400',  bar: 'bg-rose-500' },
              { label: 'Pending',  count: data.approvalStats.pending,   icon: Clock,       color: 'text-amber-400', bar: 'bg-amber-500' },
              { label: 'Returned', count: data.approvalStats.returned,  icon: RotateCcw,   color: 'text-zinc-400',   bar: 'bg-zinc-500' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center space-x-3">
                <stat.icon className={`w-4 h-4 ${stat.color} flex-shrink-0`} />
                <span className="text-xs font-mono-num font-medium text-zinc-300 w-20">{stat.label}</span>
                <div className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`${stat.bar} h-full rounded-full transition-all duration-500`}
                    style={{
                      width: `${approvalTotal > 0 ? (stat.count / approvalTotal) * 100 : 0}%`,
                      minWidth: stat.count > 0 ? '8px' : '0px'
                    }}
                  />
                </div>
                <span className="text-xs font-mono-num font-bold text-white w-8 text-right">{stat.count}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Product Catalog */}
        <Card className="overflow-hidden">
          <div className="px-6 py-3.5 df-card-header flex items-center justify-between">
            <h2 className="font-semibold text-[var(--c-fg)] text-sm">Active Product Catalog</h2>
            <span className="text-xs text-[var(--c-subtle)]">
              Attach: {data.upsellImpact?.attachRatePct || 0}% · {formatMoney(data.upsellImpact?.revenue || 0)} upsell
            </span>
          </div>
          <div className="overflow-x-auto max-h-[300px]">
            <table className="w-full text-sm">
              <thead className="text-xs text-[var(--c-subtle)] uppercase df-table-head sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">#</th>
                  <th className="px-6 py-3 text-left font-semibold">Product Name</th>
                  <th className="px-6 py-3 text-left font-semibold">SKU</th>
                  <th className="px-6 py-3 text-right font-semibold">Base Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--c-rule)]">
                {(data.catalogProducts || []).map((p, idx) => (
                  <tr key={p.id || p.name} className="df-table-row">
                    <td className="px-6 py-3 text-[var(--c-subtle)] text-xs">{idx + 1}</td>
                    <td className="px-6 py-3 font-medium text-[var(--c-fg)] text-xs">{p.name}</td>
                    <td className="px-6 py-3 text-[var(--c-muted)] font-mono text-xs">{p.sku}</td>
                    <td className="px-6 py-3 text-right font-bold text-[var(--c-fg)] text-xs">{formatMoney(p.basePrice)}</td>
                  </tr>
                ))}
                {(!data.catalogProducts || data.catalogProducts.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-[var(--c-subtle)] text-xs">No products found in catalog.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
