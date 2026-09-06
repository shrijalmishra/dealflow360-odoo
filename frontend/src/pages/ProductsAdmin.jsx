import React, { useState, useEffect } from 'react';
import {
  getRawProducts,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  createVariant,
  getPriceLists,
  createPriceListEntry,
  deletePriceListEntry
} from '../services/productApi';
import { Card, Button, Badge } from '../components/common/UI';
import { formatMoney, formatPercent } from '../utils/formatters';
import {
  Package, Plus, Edit2, Trash2, Layers, Tag,
  CheckCircle, AlertTriangle, Loader2, X, RefreshCw
} from 'lucide-react';

export default function ProductsAdmin() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [priceLists, setPriceLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'pricelists'

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showVariantModal, setShowVariantModal] = useState(null); // productId
  const [showPriceListModal, setShowPriceListModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states - Product
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [unit, setUnit] = useState('unit');
  const [taxRatePct, setTaxRatePct] = useState('18');
  const [costPrice, setCostPrice] = useState('');
  const [isSubscription, setIsSubscription] = useState(false);

  // Form states - Variant
  const [variantAttr, setVariantAttr] = useState('');
  const [variantVal, setVariantVal] = useState('');
  const [variantExtra, setVariantExtra] = useState('0');

  // Form states - Price List
  const [plProductId, setPlProductId] = useState('');
  const [plTierName, setPlTierName] = useState('GOLD');
  const [plCurrency, setPlCurrency] = useState('INR');
  const [plPrice, setPlPrice] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [prods, cats, pls] = await Promise.all([
        getRawProducts(),
        getCategories(),
        getPriceLists().catch(() => [])
      ]);
      setProducts(prods);
      setCategories(cats);
      setPriceLists(pls);
      if (cats.length > 0 && !categoryId) setCategoryId(cats[0].id);
      if (prods.length > 0 && !plProductId) setPlProductId(prods[0].id);
    } catch (err) {
      setError(err?.error?.message || err?.message || 'Failed to load catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddProduct = () => {
    setEditingProduct(null);
    setName('');
    setDescription('');
    setBasePrice('');
    setUnit('unit');
    setTaxRatePct('18');
    setCostPrice('');
    setIsSubscription(false);
    if (categories.length > 0) setCategoryId(categories[0].id);
    setShowProductModal(true);
  };

  const openEditProduct = (p) => {
    setEditingProduct(p);
    setName(p.name);
    setDescription(p.description || '');
    setCategoryId(p.categoryId);
    setBasePrice(String(p.basePrice));
    setUnit(p.unit || 'unit');
    setTaxRatePct(String(p.taxRatePct || 0));
    setCostPrice(String(p.costPrice || 0));
    setIsSubscription(Boolean(p.isSubscription));
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!name.trim() || !basePrice) return;
    try {
      setSaving(true);
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        categoryId,
        basePrice: parseFloat(basePrice),
        unit,
        taxRatePct: parseFloat(taxRatePct) || 0,
        costPrice: parseFloat(costPrice) || 0,
        isSubscription,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
      } else {
        await createProduct(payload);
      }
      setShowProductModal(false);
      await loadData();
    } catch (err) {
      alert(err?.error?.message || err?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this product?')) return;
    try {
      await deleteProduct(id);
      await loadData();
    } catch (err) {
      alert(err?.error?.message || err?.message || 'Failed to delete product');
    }
  };

  const handleAddVariant = async (e) => {
    e.preventDefault();
    if (!variantAttr.trim() || !variantVal.trim()) return;
    try {
      setSaving(true);
      await createVariant(showVariantModal, {
        attribute: variantAttr.trim(),
        value: variantVal.trim(),
        extraPrice: parseFloat(variantExtra) || 0,
      });
      setShowVariantModal(null);
      setVariantAttr('');
      setVariantVal('');
      setVariantExtra('0');
      await loadData();
    } catch (err) {
      alert(err?.error?.message || err?.message || 'Failed to add variant');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPriceList = async (e) => {
    e.preventDefault();
    if (!plProductId || !plPrice) return;
    try {
      setSaving(true);
      await createPriceListEntry({
        productId: plProductId,
        tierName: plTierName,
        currency: plCurrency,
        price: parseFloat(plPrice),
      });
      setShowPriceListModal(false);
      setPlPrice('');
      await loadData();
    } catch (err) {
      alert(err?.error?.message || err?.message || 'Failed to create price list entry');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePriceList = async (id) => {
    if (!window.confirm('Delete this tier price override?')) return;
    try {
      await deletePriceListEntry(id);
      await loadData();
    } catch (err) {
      alert(err?.error?.message || err?.message || 'Failed to delete price list entry');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-20 space-x-3 text-[var(--c-muted)] font-mono text-xs">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Loading product catalog & price lists...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 p-12">
        <AlertTriangle className="w-8 h-8 text-[var(--c-danger)]" />
        <p className="text-[var(--c-danger)] text-xs font-mono">{error}</p>
        <Button variant="outline" onClick={loadData}><RefreshCw className="w-4 h-4 mr-2" /> Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--c-rule)]">
        <div>
          <span className="text-[10px] font-mono text-[var(--c-subtle)] uppercase tracking-wider block mb-1">
            Administration / Catalog
          </span>
          <h1 className="text-xl font-bold tracking-tight text-[var(--c-fg)]">
            Products &amp; Price Lists
          </h1>
          <p className="text-xs text-[var(--c-subtle)] mt-0.5">
            Configure catalog offerings, variant modifiers, and customer tier price schedules
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-[var(--c-rule)] bg-[var(--c-surface)] p-1 text-xs font-mono">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'catalog' ? 'bg-[var(--c-fg)] text-[var(--c-bg)] font-semibold' : 'text-[var(--c-muted)] hover:text-[var(--c-fg)]'
              }`}
            >
              Catalog ({products.length})
            </button>
            <button
              onClick={() => setActiveTab('pricelists')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'pricelists' ? 'bg-[var(--c-fg)] text-[var(--c-bg)] font-semibold' : 'text-[var(--c-muted)] hover:text-[var(--c-fg)]'
              }`}
            >
              Tier Pricing ({priceLists.length})
            </button>
          </div>
          {activeTab === 'catalog' ? (
            <Button variant="primary" onClick={openAddProduct}>
              <Plus className="w-4 h-4 mr-1.5" /> Add Product
            </Button>
          ) : (
            <Button variant="primary" onClick={() => setShowPriceListModal(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Add Tier Price
            </Button>
          )}
        </div>
      </div>

      {/* CATALOG TAB */}
      {activeTab === 'catalog' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="df-table-head">
                <tr>
                  <th className="px-5 py-3 text-left font-mono font-medium text-[var(--c-subtle)] uppercase tracking-wider">Product Name</th>
                  <th className="px-5 py-3 text-left font-mono font-medium text-[var(--c-subtle)] uppercase tracking-wider">Category</th>
                  <th className="px-5 py-3 text-right font-mono font-medium text-[var(--c-subtle)] uppercase tracking-wider">Base Price</th>
                  <th className="px-5 py-3 text-right font-mono font-medium text-[var(--c-subtle)] uppercase tracking-wider">Cost / Margin</th>
                  <th className="px-5 py-3 text-center font-mono font-medium text-[var(--c-subtle)] uppercase tracking-wider">Type / Unit</th>
                  <th className="px-5 py-3 text-left font-mono font-medium text-[var(--c-subtle)] uppercase tracking-wider">Variants</th>
                  <th className="px-5 py-3 text-center font-mono font-medium text-[var(--c-subtle)] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--c-rule)]">
                {products.map((p) => {
                  const marginPct = p.basePrice > 0 ? Math.round(((p.basePrice - (p.costPrice || 0)) / p.basePrice) * 100) : 0;
                  return (
                    <tr key={p.id} className="df-table-row">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-[var(--c-fg)]">{p.name}</p>
                        {p.description && (
                          <p className="text-[11px] text-[var(--c-subtle)] line-clamp-1 mt-0.5">{p.description}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-[var(--c-surface)] border border-[var(--c-rule)] text-[var(--c-muted)]">
                          {p.category?.name || 'Standard'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-medium text-[var(--c-fg)]">
                        {formatMoney(p.basePrice)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-[11px] text-[var(--c-muted)]">
                        {formatMoney(p.costPrice || 0)}
                        <span className="ml-1 text-[10px] text-[var(--c-success)] font-semibold">({marginPct}%)</span>
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono text-[11px]">
                        <span className={`px-2 py-0.5 rounded text-[10px] border ${
                          p.isSubscription 
                            ? 'bg-[var(--c-info-bg)] text-[var(--c-info)] border-[var(--c-info-border)]' 
                            : 'bg-[var(--c-surface)] text-[var(--c-subtle)] border-[var(--c-rule)]'
                        }`}>
                          {p.isSubscription ? 'Recurring' : 'One-Time'} · /{p.unit || 'unit'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {p.variants && p.variants.length > 0 ? (
                            p.variants.map((v) => (
                              <span key={v.id} className="text-[10px] font-mono bg-[var(--c-surface)] border border-[var(--c-rule)] px-1.5 py-0.5 rounded text-[var(--c-fg)]" title={`+${formatMoney(v.extraPrice)}`}>
                                {v.attribute}: {v.value}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-[var(--c-subtle)] font-mono">None</span>
                          )}
                          <button
                            onClick={() => setShowVariantModal(p.id)}
                            className="text-[10px] font-mono text-[var(--c-muted)] hover:text-[var(--c-fg)] underline ml-1"
                          >
                            + Add
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => openEditProduct(p)}
                            className="p-1 hover:text-[var(--c-fg)] text-[var(--c-muted)] transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="p-1 hover:text-[var(--c-danger)] text-[var(--c-subtle)] transition-colors"
                            title="Deactivate"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* PRICE LISTS TAB */}
      {activeTab === 'pricelists' && (
        <Card className="overflow-hidden">
          <div className="df-card-header px-5 py-3 flex items-center justify-between">
            <h2 className="font-semibold text-[var(--c-fg)] text-xs uppercase font-mono tracking-wider">
              Customer Tier Price Schedules
            </h2>
            <span className="text-[11px] font-mono text-[var(--c-subtle)]">
              Overrides default base price for designated customer governance tiers
            </span>
          </div>
          {priceLists.length === 0 ? (
            <div className="text-center py-16 text-[var(--c-subtle)] font-mono text-xs">
              <Tag className="w-8 h-8 mx-auto opacity-30 mb-2" />
              <p>No tier-specific price list entries defined yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="df-table-head">
                  <tr>
                    <th className="px-5 py-3 text-left font-mono font-medium text-[var(--c-subtle)] uppercase tracking-wider">Product</th>
                    <th className="px-5 py-3 text-left font-mono font-medium text-[var(--c-subtle)] uppercase tracking-wider">Target Tier / Account</th>
                    <th className="px-5 py-3 text-right font-mono font-medium text-[var(--c-subtle)] uppercase tracking-wider">Base Price</th>
                    <th className="px-5 py-3 text-right font-mono font-medium text-[var(--c-subtle)] uppercase tracking-wider">Tier Special Price</th>
                    <th className="px-5 py-3 text-right font-mono font-medium text-[var(--c-subtle)] uppercase tracking-wider">Effective Discount</th>
                    <th className="px-5 py-3 text-center font-mono font-medium text-[var(--c-subtle)] uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--c-rule)]">
                  {priceLists.map((pl) => {
                    const base = pl.product?.basePrice || 0;
                    const diff = base > 0 ? Math.round(((base - pl.price) / base) * 100) : 0;
                    return (
                      <tr key={pl.id} className="df-table-row">
                        <td className="px-5 py-3.5 font-medium text-[var(--c-fg)]">
                          {pl.product?.name || 'Unknown Product'}
                          <span className="block text-[10px] font-mono text-[var(--c-subtle)]">
                            {pl.product?.category?.name || 'Category'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[var(--c-surface)] border border-[var(--c-rule)] text-[var(--c-fg)]">
                            {pl.tierName || (pl.customer ? `Account: ${pl.customer.name}` : 'ALL')}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-[var(--c-muted)]">
                          {formatMoney(base)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-[var(--c-fg)]">
                          {formatMoney(pl.price)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-[var(--c-success)]">
                          {diff > 0 ? `-${diff}% Special` : 'Standard'}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button
                            onClick={() => handleDeletePriceList(pl.id)}
                            className="text-[var(--c-subtle)] hover:text-[var(--c-danger)] transition-colors p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* PRODUCT CREATE / EDIT MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="df-card-elevated max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--c-rule)]">
              <h3 className="text-sm font-semibold text-[var(--c-fg)]">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button onClick={() => setShowProductModal(false)} className="text-[var(--c-subtle)] hover:text-[var(--c-fg)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-mono text-[var(--c-subtle)] uppercase tracking-wider mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Enterprise Server Node X8"
                  className="df-input w-full px-3 py-2 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-[var(--c-subtle)] uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="df-input w-full px-3 py-2 text-xs bg-[var(--c-surface)]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} (Max Disc: {c.discountCeiling}%)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[var(--c-subtle)] uppercase tracking-wider mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="e.g. unit, seat, license, pack"
                    className="df-input w-full px-3 py-2 text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-[var(--c-subtle)] uppercase tracking-wider mb-1">Base Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    placeholder="0.00"
                    className="df-input w-full px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[var(--c-subtle)] uppercase tracking-wider mb-1">Cost Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="0.00"
                    className="df-input w-full px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[var(--c-subtle)] uppercase tracking-wider mb-1">Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={taxRatePct}
                    onChange={(e) => setTaxRatePct(e.target.value)}
                    placeholder="18"
                    className="df-input w-full px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-mono text-[var(--c-subtle)] uppercase tracking-wider mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enterprise specifications, SLA details..."
                  className="df-input w-full px-3 py-2 text-xs resize-none"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isSubCheck"
                  checked={isSubscription}
                  onChange={(e) => setIsSubscription(e.target.checked)}
                  className="rounded border-[var(--c-rule)] bg-[var(--c-bg)]"
                />
                <label htmlFor="isSubCheck" className="text-xs text-[var(--c-fg)] select-none">
                  Product is a recurring subscription line
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-[var(--c-rule)]">
                <Button variant="outline" type="button" onClick={() => setShowProductModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Product'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VARIANT MODAL */}
      {showVariantModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="df-card-elevated max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--c-rule)]">
              <h3 className="text-sm font-semibold text-[var(--c-fg)]">Add Product Variant</h3>
              <button onClick={() => setShowVariantModal(null)} className="text-[var(--c-subtle)] hover:text-[var(--c-fg)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddVariant} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-mono text-[var(--c-subtle)] uppercase tracking-wider mb-1">Attribute Name</label>
                <input
                  type="text"
                  required
                  value={variantAttr}
                  onChange={(e) => setVariantAttr(e.target.value)}
                  placeholder="e.g. RAM, Size, Storage, Pack"
                  className="df-input w-full px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-[var(--c-subtle)] uppercase tracking-wider mb-1">Attribute Value</label>
                <input
                  type="text"
                  required
                  value={variantVal}
                  onChange={(e) => setVariantVal(e.target.value)}
                  placeholder="e.g. 64GB, 2U Rack, 10-Pack"
                  className="df-input w-full px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-[var(--c-subtle)] uppercase tracking-wider mb-1">Extra Price Modifier (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={variantExtra}
                  onChange={(e) => setVariantExtra(e.target.value)}
                  placeholder="0.00"
                  className="df-input w-full px-3 py-2 text-xs font-mono"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-[var(--c-rule)]">
                <Button variant="outline" type="button" onClick={() => setShowVariantModal(null)}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={saving}>
                  {saving ? 'Adding...' : 'Add Variant'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRICE LIST MODAL */}
      {showPriceListModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="df-card-elevated max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--c-rule)]">
              <h3 className="text-sm font-semibold text-[var(--c-fg)]">Add Tier Price Override</h3>
              <button onClick={() => setShowPriceListModal(false)} className="text-[var(--c-subtle)] hover:text-[var(--c-fg)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddPriceList} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-mono text-[var(--c-subtle)] uppercase tracking-wider mb-1">Select Product</label>
                <select
                  value={plProductId}
                  onChange={(e) => setPlProductId(e.target.value)}
                  className="df-input w-full px-3 py-2 text-xs bg-[var(--c-surface)]"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} (Base: {formatMoney(p.basePrice)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-mono text-[var(--c-subtle)] uppercase tracking-wider mb-1">Customer Governance Tier</label>
                <select
                  value={plTierName}
                  onChange={(e) => setPlTierName(e.target.value)}
                  className="df-input w-full px-3 py-2 text-xs bg-[var(--c-surface)]"
                >
                  <option value="GOLD">Gold Tier (High Volume)</option>
                  <option value="SILVER">Silver Tier (Mid-Market)</option>
                  <option value="BRONZE">Bronze Tier (Standard)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-mono text-[var(--c-subtle)] uppercase tracking-wider mb-1">Currency</label>
                <select
                  value={plCurrency}
                  onChange={(e) => setPlCurrency(e.target.value)}
                  className="df-input w-full px-3 py-2 text-xs bg-[var(--c-surface)]"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-mono text-[var(--c-subtle)] uppercase tracking-wider mb-1">Special Tier Price</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={plPrice}
                  onChange={(e) => setPlPrice(e.target.value)}
                  placeholder="0.00"
                  className="df-input w-full px-3 py-2 text-xs font-mono"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-[var(--c-rule)]">
                <Button variant="outline" type="button" onClick={() => setShowPriceListModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Override'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
