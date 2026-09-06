import React, { useState, useEffect } from 'react';
import { getCustomers, getCustomerTiers, createCustomer } from '../services/customerApi';
import { Card, Button } from '../components/common/UI';
import { Users, Plus, Loader2, AlertTriangle, Shield, X } from 'lucide-react';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [tierId, setTierId] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true); setError(null);
      const [custRes, tierRes] = await Promise.all([getCustomers(), getCustomerTiers()]);
      setCustomers(custRes.data || (Array.isArray(custRes) ? custRes : []));
      setTiers(tierRes.data || (Array.isArray(tierRes) ? tierRes : []));
      if (tierRes.data?.length > 0 && !tierId) setTierId(tierRes.data[0].id);
    } catch (err) {
      setError(err?.error?.message || err?.message || 'Failed to load customer directory.');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchCustomers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setSubmitting(true);
      await createCustomer({ name, tierId: tierId || undefined, currency });
      setName(''); setShowCreateModal(false);
      await fetchCustomers();
    } catch (err) {
      alert(err?.error?.message || err?.message || 'Failed to create customer.');
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full space-x-3 text-[var(--c-muted)]">
      <Loader2 className="w-5 h-5 animate-spin text-[var(--c-muted)]" />
      <span className="text-xs font-mono">Loading customer governance directory...</span>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-full space-y-4">
      <AlertTriangle className="w-8 h-8 text-[var(--c-danger)]" />
      <p className="text-[var(--c-danger)] text-xs font-mono">{error}</p>
      <Button variant="outline" onClick={fetchCustomers}>Retry</Button>
    </div>
  );

  const tierBadge = {
    GOLD:   'bg-[var(--c-warning-bg)] text-[var(--c-warning)] border-[var(--c-warning-border)]',
    SILVER: 'bg-[var(--c-surface)] text-[var(--c-fg)] border-[var(--c-rule)]',
    BRONZE: 'bg-[var(--c-bg)] text-[var(--c-muted)] border-[var(--c-rule)]',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--c-rule)]">
        <div>
          <span className="text-[10px] font-mono text-[var(--c-subtle)] uppercase tracking-wider block mb-1">
            Accounts / Directory
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--c-fg)]">Customer Directory</h1>
          <p className="text-xs text-[var(--c-muted)] mt-0.5">Enterprise client accounts, governance tiers &amp; discount ceilings</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />Add Customer
        </Button>
      </div>

      {/* Tier Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map(tier => (
          <Card key={tier.id} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-[var(--c-fg)] uppercase tracking-wider">{tier.name} Tier</span>
              <Shield className="w-4 h-4 text-[var(--c-subtle)]" />
            </div>
            <p className="text-[11px] font-mono text-[var(--c-subtle)] uppercase">Default Discount Ceiling</p>
            <p className="text-2xl font-mono font-medium text-[var(--c-fg)] mt-1">{tier.defaultDiscountCeiling}%</p>
          </Card>
        ))}
      </div>

      {/* Customers Table */}
      <Card className="overflow-hidden">
        <div className="df-card-header px-5 py-3 flex items-center justify-between">
          <h2 className="font-semibold text-[var(--c-fg)] text-xs uppercase font-mono tracking-wider">
            Registered Accounts ({customers.length})
          </h2>
        </div>
        {customers.length === 0 ? (
          <div className="text-center py-16 text-[var(--c-subtle)]">
            <Users className="w-10 h-10 mx-auto opacity-30 mb-2" />
            <p className="text-xs font-mono">No customers registered yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="df-table-head">
                <tr>
                  {['Customer Name','Tier','Discount Ceiling','Currency','Account ID'].map(h => (
                    <th key={h} className="px-5 py-3 text-left font-mono font-medium text-[var(--c-subtle)] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--c-rule)]">
                {customers.map(c => (
                  <tr key={c.id} className="df-table-row">
                    <td className="px-5 py-3.5 font-medium text-[var(--c-fg)]">{c.name}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase border ${tierBadge[c.tier?.name] || 'bg-[var(--c-bg)] text-[var(--c-muted)] border-[var(--c-rule)]'}`}>
                        {c.tier?.name || 'STANDARD'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[var(--c-fg)]">
                      {c.tier?.defaultDiscountCeiling ? `${c.tier.defaultDiscountCeiling}%` : '10%'}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[var(--c-muted)]">{c.currency || 'INR'}</td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-[var(--c-subtle)]">{c.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Customer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="df-card-elevated max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--c-rule)]">
              <h3 className="text-sm font-semibold text-[var(--c-fg)]">Add New Customer</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[var(--c-subtle)] hover:text-[var(--c-fg)] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-[var(--c-subtle)] uppercase tracking-wider mb-1.5">Company / Customer Name</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Acme Global Industries"
                  className="df-input w-full px-3 py-2 text-xs" />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-[var(--c-subtle)] uppercase tracking-wider mb-1.5">Governance Tier</label>
                <select value={tierId} onChange={e => setTierId(e.target.value)} className="df-input w-full px-3 py-2 text-xs bg-[var(--c-surface)] text-[var(--c-fg)]">
                  {tiers.map(t => <option key={t.id} value={t.id}>{t.name} (Ceiling: {t.defaultDiscountCeiling}%)</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-mono text-[var(--c-subtle)] uppercase tracking-wider mb-1.5">Currency</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)} className="df-input w-full px-3 py-2 text-xs bg-[var(--c-surface)] text-[var(--c-fg)]">
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <Button variant="outline" type="button" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Customer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
