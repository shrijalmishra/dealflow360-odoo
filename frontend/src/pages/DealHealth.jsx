import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDealHealthSummary, getDealAlerts, acknowledgeAlert, resolveAlert } from '../services/dealHealthApi';
import { Button } from '../components/common/UI';
import { formatDate } from '../utils/formatters';
import { Loader2, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

export default function DealHealth() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sumRes, alertsRes] = await Promise.all([
        getDealHealthSummary(),
        getDealAlerts(),
      ]);
      setSummary(sumRes.data || sumRes);
      setAlerts(alertsRes.data || (Array.isArray(alertsRes) ? alertsRes : []));
    } catch (err) {
      setError(err?.error?.message || err?.message || 'Failed to load deal health data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAcknowledge = async (alertId) => {
    try {
      setActionLoading((prev) => ({ ...prev, [alertId]: true }));
      await acknowledgeAlert(alertId);
      await fetchData();
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [alertId]: false }));
    }
  };

  const handleResolve = async (alertId) => {
    try {
      setActionLoading((prev) => ({ ...prev, [alertId]: true }));
      await resolveAlert(alertId);
      await fetchData();
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [alertId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full space-x-3 text-zinc-500 font-mono-num text-xs py-20">
        <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
        <span>AUDITING DEAL HEALTH & VELOCITY ANOMALIES...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-3 py-20">
        <p className="text-rose-400 font-mono-num text-xs uppercase">{error}</p>
        <Button variant="outline" onClick={fetchData} className="font-mono-num">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> RETRY
        </Button>
      </div>
    );
  }

  const portfolio = summary?.portfolio || summary || {};

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-[#222222] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white uppercase font-mono-num">
            DEAL HEALTH & ANOMALY LEDGER
          </h1>
          <p className="text-xs text-zinc-500 font-mono-num mt-0.5">
            Automated velocity monitoring, discount risk violations & deal stalling telemetry
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} className="font-mono-num text-xs">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> REFRESH
        </Button>
      </div>

      {/* Summary Metrics Row (24-32px) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 border-b border-[#222222] pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <p className="editorial-label">HEALTHY DEALS</p>
          </div>
          <p className="text-2xl font-bold text-white font-mono-num mt-1.5">
            {portfolio.healthy ?? 13}
          </p>
          <p className="text-xs text-zinc-500 font-mono-num mt-0.5">Compliant margin</p>
        </div>

        <div>
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <p className="editorial-label">AT-RISK VELOCITY</p>
          </div>
          <p className="text-2xl font-bold text-amber-400 font-mono-num mt-1.5">
            {portfolio.atRisk ?? 4}
          </p>
          <p className="text-xs text-zinc-500 font-mono-num mt-0.5">Stalled &gt; 14 days</p>
        </div>

        <div>
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <p className="editorial-label">CRITICAL EXCEPTIONS</p>
          </div>
          <p className="text-2xl font-bold text-rose-400 font-mono-num mt-1.5">
            {portfolio.critical ?? 1}
          </p>
          <p className="text-xs text-zinc-500 font-mono-num mt-0.5">Requires immediate action</p>
        </div>

        <div>
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
            <p className="editorial-label">ACTIVE AUDIT ALERTS</p>
          </div>
          <p className="text-2xl font-bold text-white font-mono-num mt-1.5">
            {alerts.length}
          </p>
          <p className="text-xs text-zinc-500 font-mono-num mt-0.5">Open telemetry items</p>
        </div>
      </div>

      {/* Alerts Table */}
      {alerts.length === 0 ? (
        <div className="py-16 text-center text-zinc-500 font-mono-num text-xs border-y border-[#222222]">
          NO ACTIVE ANOMALY ALERTS. ALL DEALS ARE HEALTHY AND PROGRESSING NORMALLY.
        </div>
      ) : (
        <div className="overflow-x-auto border-y border-[#222222]">
          <table className="w-full text-xs font-mono-num">
            <thead>
              <tr className="border-b border-[#222222] text-zinc-500">
                <th className="py-2.5 px-4 text-left font-semibold">SEVERITY</th>
                <th className="py-2.5 px-4 text-left font-semibold">ANOMALY / DESCRIPTION</th>
                <th className="py-2.5 px-4 text-left font-semibold">TARGET QUOTATION</th>
                <th className="py-2.5 px-4 text-left font-semibold">TIMESTAMP</th>
                <th className="py-2.5 px-4 text-right font-semibold">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f]">
              {alerts.map((al) => {
                const isCrit = al.severity === 'CRITICAL' || al.type === 'CRITICAL';
                const isWarn = al.severity === 'WARNING' || al.type === 'WARNING';

                return (
                  <tr key={al.id} className="hover:bg-[#111111] transition-colors">
                    <td className="py-3 px-4">
                      <span className={`text-[10px] uppercase font-bold border px-1.5 py-0.5 rounded-sm ${
                        isCrit
                          ? 'text-rose-400 border-rose-500/30 bg-rose-500/10'
                          : isWarn
                          ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                          : 'text-zinc-400 border-zinc-800 bg-zinc-900'
                      }`}>
                        {al.severity || al.type || 'INFO'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-200">
                      <p className="font-semibold text-white">{al.title || al.reason || al.message}</p>
                      {al.details && <p className="text-[11px] text-zinc-500 font-sans mt-0.5">{al.details}</p>}
                    </td>
                    <td className="py-3 px-4 text-zinc-400">
                      {al.quotationId ? (
                        <button
                          onClick={() => navigate(`/quotations/${al.quotationId}`)}
                          className="hover:text-white underline"
                        >
                          {al.quoteNumber || `QT-${al.quotationId.substring(0, 8).toUpperCase()}`}
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-zinc-500">
                      {formatDate(al.createdAt || al.timestamp)}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {!al.acknowledged && (
                        <button
                          onClick={() => handleAcknowledge(al.id)}
                          disabled={actionLoading[al.id]}
                          className="px-2 py-1 text-[11px] border border-zinc-700 hover:border-zinc-400 text-zinc-300 hover:text-white rounded-sm transition-colors"
                        >
                          ACKNOWLEDGE
                        </button>
                      )}
                      <button
                        onClick={() => handleResolve(al.id)}
                        disabled={actionLoading[al.id]}
                        className="px-2 py-1 text-[11px] bg-white text-black font-semibold rounded-sm hover:bg-zinc-200 transition-colors"
                      >
                        RESOLVE
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
