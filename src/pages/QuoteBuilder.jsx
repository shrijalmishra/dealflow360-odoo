import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getQuoteById, recalculateQuote, getRecommendations } from '../services/quoteApi';
import { getProducts } from '../services/productApi';
import { Card, Button, Badge, StatusBadge } from '../components/common/UI';
import { formatMoney, formatPercent, formatDate } from '../utils/formatters';
import { Plus, Trash2, RefreshCw, Save, Send, Sparkles, X, TrendingUp } from 'lucide-react';

export default function QuoteBuilder() {
  const { quoteId } = useParams();
  
  const [quote, setQuote] = useState(null);
  const [products, setProducts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [dismissedRecs, setDismissedRecs] = useState([]);

  // Local state for edits before recalculation
  const [editedLines, setEditedLines] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const qId = quoteId || 'q1';
        
        const [quoteRes, productRes, recRes] = await Promise.all([
          getQuoteById(qId),
          getProducts(),
          getRecommendations(qId)
        ]);
        
        setQuote(quoteRes.data);
        setEditedLines(quoteRes.data.lines || []);
        setProducts(productRes.data);
        setRecommendations(recRes.data);
      } catch (error) {
        console.error('Error fetching quote data:', error);
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
        type: product.type,
        quantity: 1,
        unitPrice: product.price,
        discountPercent: 0,
        discountAmount: 0,
        tax: product.price * 0.18,
        lineTotal: product.price,
        margin: product.margin
      }
    ]);
  };

  const handleAddUpsell = async (rec) => {
    // Add the recommended product as a new line
    handleAddProduct({
      id: rec.productId,
      name: rec.productName,
      type: 'ONE_TIME',
      price: 5000, // from mock product catalog
      margin: rec.marginDelta
    });
    // After adding, trigger a recalculate to get authoritative totals
    // In real flow, this would call the backend
    setDismissedRecs([...dismissedRecs, rec.productId]);
  };

  const handleDismissRec = (productId) => {
    setDismissedRecs([...dismissedRecs, productId]);
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

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Quote...</div>;
  if (!quote) return <div className="p-8 text-center text-red-500">Failed to load quote.</div>;

  const visibleRecs = recommendations.filter(r => !dismissedRecs.includes(r.productId));

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{quote.quoteNumber} — {quote.customerName}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Created: {formatDate(quote.created)} | Rep: {quote.assignedRep}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <StatusBadge status={quote.status} />
          <Button variant="outline" onClick={handleRecalculate} disabled={recalculating}>
            <RefreshCw className={`w-4 h-4 mr-2 ${recalculating ? 'animate-spin' : ''}`} />
            Recalculate
          </Button>
          <Button variant="outline"><Save className="w-4 h-4 mr-2" /> Save Draft</Button>
          <Button variant="primary"><Send className="w-4 h-4 mr-2" /> Submit Quote</Button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 min-h-0 overflow-hidden">
        
        {/* LEFT PANE: PRODUCT SELECTION */}
        <Card className="w-56 flex flex-col overflow-hidden flex-shrink-0">
          <div className="p-3 border-b border-gray-100 bg-gray-50 font-semibold text-sm">
            Product Catalog
          </div>
          <div className="p-3 overflow-y-auto flex-1 space-y-2">
            {products.map(p => (
              <div key={p.id} className="border border-gray-200 p-2.5 rounded-md hover:border-primary-300 transition-colors flex justify-between items-center bg-white">
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">{formatMoney(p.price)}</p>
                </div>
                <button 
                  onClick={() => handleAddProduct(p)}
                  className="w-7 h-7 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center hover:bg-primary-100 flex-shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* CENTER PANE: QUOTE LINES */}
        <div className="flex-1 flex flex-col space-y-4 overflow-hidden min-w-0">
          <Card className="flex-1 overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 w-20">Qty</th>
                  <th className="px-4 py-3">Unit Price</th>
                  <th className="px-4 py-3 w-24">Disc %</th>
                  <th className="px-4 py-3 text-right">Line Total</th>
                  <th className="px-4 py-3 text-center w-16"></th>
                </tr>
              </thead>
              <tbody>
                {editedLines.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                      No products added yet. Select from the catalog.
                    </td>
                  </tr>
                ) : (
                  editedLines.map((line, idx) => (
                    <tr key={line.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{line.productName}</p>
                        <p className="text-xs text-gray-500">{line.type.replace('_', ' ')}</p>
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="number" min="1"
                          value={line.quantity}
                          onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                          className="w-16 p-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatMoney(line.unitPrice)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <input 
                            type="number" min="0" max="100"
                            value={line.discountPercent}
                            onChange={(e) => handleLineChange(idx, 'discountPercent', e.target.value)}
                            className="w-16 p-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                          />
                          <span className="ml-1 text-gray-500">%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatMoney(line.lineTotal)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleRemoveLine(idx)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>

          {/* BOTTOM PANE: FINANCIAL SUMMARY */}
          <Card className="flex-shrink-0 p-5 bg-white border-t-4 border-t-primary-500 shadow-lg">
            <div className="flex justify-between items-start gap-8">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 uppercase mb-3">Quote Health</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Margin</span>
                    <span className="font-medium text-green-700">{formatMoney(quote.marginAmount)} ({formatPercent(quote.marginPercent)})</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-100">
                    <span className="text-gray-500">Discount Risk</span>
                    <span className={`font-bold ${quote.discountRiskScore > 70 ? 'text-red-600' : 'text-green-600'}`}>
                      {quote.discountRiskScore} / 100
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Approval</span>
                    <span className="font-medium text-amber-600">
                      {quote.approval.requiredLevel.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900 font-medium">{formatMoney(quote.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount</span>
                  <span className="text-red-600 font-medium">-{formatMoney(quote.discountTotal)}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-600">Tax</span>
                  <span className="text-gray-900 font-medium">{formatMoney(quote.taxTotal)}</span>
                </div>
                <div className="flex justify-between pt-1 text-lg">
                  <span className="font-bold text-gray-900">Grand Total</span>
                  <span className="font-bold text-gray-900">{formatMoney(quote.grandTotal)}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT PANE: UPSELL / CROSS-SELL */}
        <Card className="w-64 flex flex-col overflow-hidden flex-shrink-0">
          <div className="p-3 border-b border-gray-100 bg-gray-50 font-semibold text-sm flex items-center">
            <Sparkles className="w-4 h-4 mr-2 text-amber-500" />
            Recommendations
          </div>
          <div className="p-3 overflow-y-auto flex-1 space-y-3">
            {visibleRecs.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-xs">
                No recommendations available.
              </div>
            ) : (
              visibleRecs.map(rec => (
                <div key={rec.productId} className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-sm text-gray-900">{rec.productName}</p>
                    <button onClick={() => handleDismissRec(rec.productId)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{rec.reason}</p>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="success">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +{formatMoney(rec.marginDelta)}
                    </Badge>
                    {rec.promotion && (
                      <Badge variant="warning">{rec.promotion}</Badge>
                    )}
                  </div>
                  {rec.score && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Match Score</span>
                        <span>{rec.score}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${rec.score}%` }}></div>
                      </div>
                    </div>
                  )}
                  <Button
                    variant="primary"
                    className="w-full text-xs"
                    onClick={() => handleAddUpsell(rec)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add to Quote
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
