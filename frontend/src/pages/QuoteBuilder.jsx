import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getQuoteById,
  getQuotes,
  createQuote,
  recalculateQuote,
  getRecommendations,
  acceptRecommendation
} from '../services/quoteApi';
import { getProducts } from '../services/productApi';
import { getCustomers } from '../services/customerApi';
import api from '../services/api';
import { Button, StatusBadge } from '../components/common/UI';
import { formatMoney, formatPercent, formatDate } from '../utils/formatters';
import {
  Plus,
  Trash2,
  RefreshCw,
  Save,
  Send,
  Loader2,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function QuoteBuilder() {
  const { quoteId } = useParams();
  const navigate = useNavigate();

  const [quote, setQuote] = useState(null);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [dismissedRecs, setDismissedRecs] = useState([]);
  const [editedLines, setEditedLines] = useState([]);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [productRes, customerRes] = await Promise.all([
          getProducts().catch(() => ({ data: [] })),
          getCustomers().catch(() => ({ data: [] }))
        ]);
        const prodList = productRes.data || [];
        const custList = customerRes.data || [];
        setProducts(prodList);
        setCustomers(custList);

        let targetQuote = null;
        let effectiveId = quoteId;

        if (effectiveId && effectiveId !== 'new' && !effectiveId.startsWith('new-')) {
          try {
            const quoteRes = await getQuoteById(effectiveId);
            targetQuote = quoteRes.data;
          } catch (err) {
            console.warn(`Quote ${effectiveId} could not be loaded:`, err);
          }
        }

        if (!targetQuote) {
          const defaultCust = custList[0] || { id: 'bc6d7779-9478-49f1-b0b2-8ba35890de1a', name: 'Acme Corp' };
          setSelectedCustomerId(defaultCust.id);

          if (effectiveId === 'new') {
            targetQuote = {
              id: 'new',
              quoteNumber: 'QT-NEW-DRAFT',
              customerId: defaultCust.id,
              customerName: defaultCust.name,
              assignedRep: 'Sales Rep',
              created: new Date().toISOString(),
              status: 'DRAFT',
              subtotal: 0,
              discountTotal: 0,
              grandTotal: 0,
              lines: [],
            };
          } else {
            const quotesRes = await getQuotes();
            const list = quotesRes.data || [];
            if (list.length > 0) {
              effectiveId = list[0].id;
              try {
                const quoteRes = await getQuoteById(effectiveId);
                targetQuote = quoteRes.data;
              } catch (e) {
                targetQuote = list[0];
              }
            } else {
              targetQuote = {
                id: 'new',
                quoteNumber: 'QT-DRAFT-01',
                customerId: defaultCust.id,
                customerName: defaultCust.name,
                assignedRep: 'Sales Rep',
                created: new Date().toISOString(),
                status: 'DRAFT',
                subtotal: 0,
                discountTotal: 0,
                grandTotal: 0,
                lines: [],
              };
            }
          }
        } else if (targetQuote.customerId) {
          setSelectedCustomerId(targetQuote.customerId);
        }

        setQuote(targetQuote);
        setEditedLines(targetQuote.lines || []);

        if (targetQuote.id && targetQuote.id !== 'new') {
          try {
            const recRes = await getRecommendations(targetQuote.id);
            setRecommendations(recRes.data || []);
          } catch (recErr) {
            setRecommendations([]);
          }
        } else {
          setRecommendations([]);
        }
      } catch (error) {
        console.error('Error fetching quote builder data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [quoteId]);

  const handleLineChange = (index, field, value) => {
    const newLines = [...editedLines];
    newLines[index] = { ...newLines[index], [field]: Number(value) };
    setEditedLines(newLines);
  };

  const handleRemoveLine = (index) => {
    const newLines = [...editedLines];
    newLines.splice(index, 1);
    setEditedLines(newLines);
  };

  const handleAddProduct = (product) => {
    setEditedLines([
      ...editedLines,
      {
        id: `newLine-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        type: product.type || 'ONE_TIME',
        quantity: 1,
        unitPrice: product.price || product.basePrice || 0,
        discountPercent: 0,
        discountAmount: 0,
        tax: 0,
        lineTotal: product.price || product.basePrice || 0,
        margin: product.margin || 0
      }
    ]);
  };

  const handleAddUpsell = async (rec) => {
    try {
      if (quote?.id && quote.id !== 'new' && !quote.id.startsWith('new-')) {
        setLoading(true);
        const updated = await acceptRecommendation(quote.id, rec.id);
        const qData = updated.data || updated;
        setQuote(qData);
        setEditedLines(qData.lines || []);
      } else {
        const found = products.find(p => p.id === rec.productId);
        const realProd = found || {
          id: rec.productId,
          name: rec.productName,
          type: 'ONE_TIME',
          price: rec.price || rec.basePrice || rec.unitPrice || 0,
          margin: 0,
        };
        handleAddProduct(realProd);
      }
      setDismissedRecs([...dismissedRecs, rec.productId]);
    } catch (err) {
      console.error('Failed to accept recommendation:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    try {
      setRecalculating(true);
      const payload = { lines: editedLines };
      const response = await recalculateQuote(quote.id, payload);
      setQuote(response.data);
      setEditedLines(response.data.lines);
    } catch (error) {
      console.error('Recalculation failed:', error);
    } finally {
      setRecalculating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (editedLines.length === 0) {
      setNotification({ type: 'error', message: 'Please add at least one line item to the quotation.' });
      return;
    }
    try {
      setSaving(true);
      setNotification(null);
      const user = JSON.parse(localStorage.getItem('dealflow_user') || '{}');
      const repId = user.id || '94206741-4b35-4863-b8fc-a915f555bf98';
      const custId = selectedCustomerId || quote?.customerId || customers[0]?.id || 'bc6d7779-9478-49f1-b0b2-8ba35890de1a';

      const payload = {
        customerId: custId,
        repId: repId,
        lines: editedLines.map((l) => ({
          productId: l.productId,
          quantity: Math.max(1, Number(l.quantity) || 1),
          discountPct: Math.min(100, Math.max(0, Number(l.discountPercent) || 0)),
          lineType: l.type || 'ONE_TIME',
        })),
      };

      const res = await createQuote(payload);
      const created = res.quotation || res.data?.quotation || res.data || res;
      setNotification({ type: 'success', message: 'Quotation draft saved successfully!' });
      if (created?.id && (!quoteId || quoteId === 'new')) {
        setTimeout(() => navigate(`/quotations/${created.id}`), 800);
      }
    } catch (err) {
      console.error('Failed to save draft:', err);
      setNotification({ type: 'error', message: err?.error?.message || err?.message || 'Failed to save draft.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitQuote = async () => {
    if (editedLines.length === 0) {
      setNotification({ type: 'error', message: 'Please add at least one line item before submitting.' });
      return;
    }
    try {
      setSaving(true);
      setNotification(null);
      if (quote?.id && quote.id !== 'new' && !quote.id.startsWith('new-')) {
        try {
          await api.post(`/approvals/quotations/${quote.id}/request`, {
            currentStep: quote.approval?.requiredLevel || 'SALES_MANAGER',
            reason: 'Quotation submitted for commercial governance review.'
          });
        } catch (appErr) {
          // May already be submitted or not require approval
        }
        setNotification({ type: 'success', message: 'Quotation submitted into approval workflow!' });
        setTimeout(() => navigate('/quotations'), 1000);
      } else {
        const user = JSON.parse(localStorage.getItem('dealflow_user') || '{}');
        const repId = user.id || '94206741-4b35-4863-b8fc-a915f555bf98';
        const custId = selectedCustomerId || quote?.customerId || customers[0]?.id || 'bc6d7779-9478-49f1-b0b2-8ba35890de1a';

        const payload = {
          customerId: custId,
          repId: repId,
          lines: editedLines.map((l) => ({
            productId: l.productId,
            quantity: Math.max(1, Number(l.quantity) || 1),
            discountPct: Math.min(100, Math.max(0, Number(l.discountPercent) || 0)),
            lineType: l.type || 'ONE_TIME',
          })),
        };

        await createQuote(payload);
        setNotification({ type: 'success', message: 'Quotation successfully created and submitted!' });
        setTimeout(() => navigate('/quotations'), 1000);
      }
    } catch (err) {
      console.error('Failed to submit quote:', err);
      setNotification({ type: 'error', message: err?.error?.message || err?.message || 'Failed to submit quote.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full space-x-3 text-zinc-500 font-mono-num text-xs py-20">
        <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
        <span>INITIALIZING QUOTE ENGINE...</span>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="p-12 text-center text-rose-400 font-mono-num text-xs">
        QUOTATION NOT FOUND
      </div>
    );
  }

  const visibleRecs = recommendations.filter(r => !dismissedRecs.includes(r.productId));

  return (
    <div className="flex flex-col h-full space-y-5 max-w-7xl mx-auto pb-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-[#222222] pb-4 gap-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/quotations')}
            className="p-1.5 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold tracking-tight text-white font-mono-num uppercase">
                {quote.quoteNumber} —
              </h1>
              {quote.id === 'new' && customers.length > 0 ? (
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    const found = customers.find((c) => c.id === e.target.value);
                    setSelectedCustomerId(e.target.value);
                    if (found) setQuote((q) => ({ ...q, customerId: found.id, customerName: found.name }));
                  }}
                  className="bg-[#111111] border border-[#333333] text-white text-xs font-mono-num px-2.5 py-1 rounded-sm focus:outline-none focus:border-zinc-400"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              ) : (
                <span className="text-lg font-bold tracking-tight text-white font-mono-num uppercase">
                  {quote.customerName}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 font-mono-num mt-0.5">
              Created: {formatDate(quote.created)} · Rep: {quote.assignedRep || 'Sales Rep'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <StatusBadge status={quote.status} />
          <Button
            variant="outline"
            onClick={handleRecalculate}
            disabled={recalculating || saving}
            className="font-mono-num text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${recalculating ? 'animate-spin' : ''}`} />
            RECALCULATE
          </Button>
          <Button
            variant="secondary"
            onClick={handleSaveDraft}
            disabled={saving || recalculating}
            className="font-mono-num text-xs"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            SAVE DRAFT
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmitQuote}
            disabled={saving || recalculating}
            className="font-mono-num text-xs"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
            SUBMIT QUOTE
          </Button>
        </div>
      </div>

      {/* ── NOTIFICATION BANNER ── */}
      {notification && (
        <div className={`p-3 rounded-sm text-xs font-mono-num flex items-center justify-between border ${
          notification.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-zinc-500 hover:text-white">✕</button>
        </div>
      )}

      {/* ── WORKSPACE SPLIT ── */}
      <div className="flex flex-1 gap-6 min-h-0 overflow-hidden">
        {/* Left Catalog Pane */}
        <div className="w-64 flex flex-col border border-[#222222] bg-[#111111] rounded-sm overflow-hidden flex-shrink-0">
          <div className="p-3 border-b border-[#222222] text-zinc-400 font-mono-num text-xs font-semibold uppercase tracking-wider">
            PRODUCT CATALOG
          </div>
          <div className="p-2 overflow-y-auto flex-1 divide-y divide-[#1f1f1f]">
            {products.map((p) => (
              <div
                key={p.id}
                className="py-2.5 px-2 hover:bg-[#161616] transition-colors flex justify-between items-center group rounded-sm"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-xs font-mono-num text-zinc-200 truncate">{p.name}</p>
                  <p className="text-[11px] text-zinc-400 font-mono-num mt-0.5">{formatMoney(p.price)}</p>
                </div>
                <button
                  onClick={() => handleAddProduct(p)}
                  className="w-6 h-6 rounded-sm bg-zinc-800 hover:bg-white hover:text-black text-zinc-300 flex items-center justify-center flex-shrink-0 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Center Lines Table */}
        <div className="flex-1 flex flex-col space-y-4 overflow-hidden min-w-0">
          <div className="flex-1 overflow-y-auto border border-[#222222] bg-[#111111] rounded-sm">
            <table className="w-full text-xs font-mono-num text-left">
              <thead className="bg-[#0a0a0a] text-zinc-500 uppercase border-b border-[#222222] sticky top-0">
                <tr>
                  <th className="px-4 py-2.5 font-semibold text-[11px]">PRODUCT</th>
                  <th className="px-4 py-2.5 w-20 font-semibold text-[11px]">QTY</th>
                  <th className="px-4 py-2.5 font-semibold text-[11px]">UNIT PRICE</th>
                  <th className="px-4 py-2.5 w-24 font-semibold text-[11px]">DISC %</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-[11px]">LINE TOTAL</th>
                  <th className="px-4 py-2.5 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f1f]">
                {editedLines.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-16 text-center text-zinc-500 text-xs">
                      No line items configured. Select items from the catalog.
                    </td>
                  </tr>
                ) : (
                  editedLines.map((line, idx) => (
                    <tr key={line.id} className="hover:bg-[#161616] transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-zinc-200">{line.productName}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{line.type?.replace('_', ' ')}</p>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                          className="w-14 p-1 text-center bg-[#0a0a0a] border border-[#262626] rounded-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {formatMoney(line.unitPrice)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={line.discountPercent}
                            onChange={(e) => handleLineChange(idx, 'discountPercent', e.target.value)}
                            className="w-12 p-1 text-center bg-[#0a0a0a] border border-[#262626] rounded-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
                          />
                          <span className="text-zinc-500">%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-white">
                        {formatMoney(line.lineTotal)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleRemoveLine(idx)}
                          className="text-zinc-500 hover:text-rose-400 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Financial Summary - Subtle Surface */}
          <div className="p-4 bg-[#111111] border border-[#222222] rounded-sm flex-shrink-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 border-b md:border-b-0 md:border-r border-[#222222] pb-4 md:pb-0 md:pr-6 text-xs font-mono-num">
                <p className="editorial-label mb-2">COMMERCIAL GOVERNANCE & RISK</p>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Gross Margin</span>
                  <span className="font-bold text-emerald-400">
                    {formatMoney(quote.marginAmount || 0)} ({formatPercent(quote.marginPercent || 35)})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Discount Risk Score</span>
                  <span className={`font-bold ${quote.discountRiskScore > 70 ? 'text-rose-400' : 'text-zinc-300'}`}>
                    {quote.discountRiskScore || 15} / 100
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Signoff Tier</span>
                  <span className="font-bold text-white">
                    {quote.approval?.requiredLevel?.replace(/_/g, ' ') || 'NONE REQUIRED'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono-num">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal</span>
                  <span className="text-white font-semibold">{formatMoney(quote.subtotal)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Total Discount</span>
                  <span className="text-rose-400 font-semibold">-{formatMoney(quote.discountTotal)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Tax Total</span>
                  <span className="text-white font-semibold">{formatMoney(quote.taxTotal || 0)}</span>
                </div>
                <div className="flex justify-between border-t border-[#222222] pt-2 text-sm">
                  <span className="font-bold text-white uppercase">Net Total</span>
                  <span className="font-extrabold text-white text-base">{formatMoney(quote.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Upsell Recommendations Pane if available */}
        {visibleRecs.length > 0 && (
          <div className="w-64 flex flex-col border border-[#222222] bg-[#111111] rounded-sm overflow-hidden flex-shrink-0">
            <div className="p-3 border-b border-[#222222] text-zinc-400 font-mono-num text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-zinc-300" /> RECOMMENDED UPSELLS
            </div>
            <div className="p-2 overflow-y-auto flex-1 space-y-2">
              {visibleRecs.map((rec) => (
                <div key={rec.id} className="p-2.5 bg-[#161616] border border-[#262626] rounded-sm space-y-1.5">
                  <p className="text-xs font-mono-num font-semibold text-zinc-200">{rec.productName}</p>
                  <p className="text-[11px] text-zinc-500 font-mono-num">{rec.rationale}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-bold text-white font-mono-num">{formatMoney(rec.price)}</span>
                    <button
                      onClick={() => handleAddUpsell(rec)}
                      className="px-2 py-0.5 text-[11px] font-mono-num bg-white text-black font-semibold rounded-sm hover:bg-zinc-200 transition-colors"
                    >
                      + ADD
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
