import React, { useState, useEffect } from 'react';
import {
  Shield, Bell, Database, Users,
  Globe, Lock, AlertTriangle, CheckCircle, ChevronRight,
  Zap, Server, Save, Loader2, RefreshCw, Sliders
} from 'lucide-react';
import { Card, Button, Badge } from '../components/common/UI';
import api from '../services/api';

const SECTIONS = [
  {
    id: 'discount-governance',
    label: 'Discount & Approval Rules',
    icon: Sliders,
    description: 'Tier ceilings, category limits, and approval routing brackets',
  },
  {
    id: 'general',
    label: 'General & Regional',
    icon: Globe,
    description: 'Company name, timezone and regional settings',
  },
  {
    id: 'security',
    label: 'Security & Auth',
    icon: Shield,
    description: 'Password policy, JWT configuration, and RBAC matrix',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    description: 'Email alerts, deal health thresholds, approval reminders',
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: Zap,
    description: 'CRM, ERP, payment gateway, webhook endpoints',
  },
  {
    id: 'users',
    label: 'Users & Roles',
    icon: Users,
    description: 'Team members, role assignments and permissions',
  },
  {
    id: 'data',
    label: 'Data & Backup',
    icon: Database,
    description: 'Retention policies, export schedules, audit logs',
  },
];

const PERMISSIONS = [
  { role: 'ADMIN',         desc: 'Full platform access — all modules, settings, user management', tag: 'ADMIN' },
  { role: 'SALES_MANAGER', desc: 'Quotations, pipeline, deal health, approvals, reports', tag: 'SALES MGR' },
  { role: 'SALES_REP',     desc: 'Quotations, customer management, pipeline view', tag: 'SALES' },
  { role: 'FINANCE_OPS',   desc: 'Finance approvals, billing, subscriptions, reports, orders, fulfillment', tag: 'FINANCE' },
  { role: 'OPERATIONS',    desc: 'Ops dashboard, orders, fulfillment, warehouses, inventory, backorders', tag: 'OPERATIONS' },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('discount-governance');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Live Governance Settings (PS Section A3)
  const [tiers, setTiers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [approvalRules, setApprovalRules] = useState([]);

  // Recommendation Tuning (PS Section A6)
  const [minMarginThreshold, setMinMarginThreshold] = useState('15');
  const [promotionBoost, setPromotionBoost] = useState('1.5');

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const res = await api.get('/discount-risk/config');
      const data = res.data || res;
      setTiers(data.tiers || []);
      setCategories(data.categories || []);
      setApprovalRules(data.approvalRules || []);
    } catch (err) {
      console.error('Failed to load governance config:', err);
      setErrorMessage('Could not load live governance rules from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSaveGovernance = async () => {
    try {
      setSaving(true);
      setSavedMessage('');
      setErrorMessage('');

      await api.put('/discount-risk/config', {
        tiers,
        categories,
        approvalRules,
      });

      setSavedMessage('Discount governance and approval chain rules updated and active!');
      setTimeout(() => setSavedMessage(''), 4000);
    } catch (err) {
      setErrorMessage(err?.error?.message || err?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const updateTierCeiling = (id, val) => {
    setTiers(prev => prev.map(t => t.id === id ? { ...t, defaultDiscountCeiling: val } : t));
  };

  const updateCategoryCeiling = (id, val) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, discountCeiling: val } : c));
  };

  const updateRuleScore = (id, field, val) => {
    setApprovalRules(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--c-rule)]">
        <div>
          <span className="text-[10px] font-mono text-[var(--c-subtle)] uppercase tracking-wider block mb-1">
            System / Governance &amp; Rules
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--c-fg)]">
            Platform Settings
          </h1>
          <p className="text-xs text-[var(--c-muted)] mt-0.5">
            Configure live commercial governance policies, discount ceilings, and approval routing
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleSaveGovernance}
          disabled={saving || loading}
          className="text-xs py-2 px-3.5"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {savedMessage && (
        <div className="p-3.5 bg-[var(--c-success-bg)] border border-[var(--c-success-border)] text-[var(--c-success)] rounded-lg text-xs font-mono flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{savedMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-[var(--c-danger-bg)] border border-[var(--c-danger-border)] text-[var(--c-danger)] rounded-lg text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Sidebar nav */}
        <div className="lg:col-span-1 space-y-1">
          {SECTIONS.map(s => {
            const isActive = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors text-left border ${
                  isActive
                    ? 'bg-[var(--c-surface)] text-[var(--c-fg)] border-[var(--c-rule)]'
                    : 'text-[var(--c-muted)] border-transparent hover:text-[var(--c-fg)] hover:bg-[var(--c-surface)]'
                }`}
              >
                <s.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[var(--c-fg)]' : 'text-[var(--c-subtle)]'}`} />
                <span>{s.label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-[var(--c-muted)]" />}
              </button>
            );
          })}
        </div>

        {/* Content panel */}
        <div className="lg:col-span-3 space-y-5">

          {/* ── DISCOUNT GOVERNANCE (PS SECTION A3) ── */}
          {activeSection === 'discount-governance' && (
            <div className="space-y-5">
              {/* Customer Tier Ceilings */}
              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--c-rule)]">
                  <div>
                    <h2 className="font-semibold text-[var(--c-fg)] text-sm">Customer Tier Discount Ceilings</h2>
                    <p className="text-xs text-[var(--c-subtle)] mt-0.5">
                      Ceilings enforced per governance tier. Higher discounts trigger approval escalation.
                    </p>
                  </div>
                  <Badge variant="primary">PS A3 Rule</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {tiers.map(t => (
                    <div key={t.id} className="p-3.5 border border-[var(--c-rule)] bg-[var(--c-surface)] rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-[var(--c-fg)]">{t.name} TIER</span>
                        <span className="text-[10px] font-mono text-[var(--c-subtle)]">MAX CEILING</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="100"
                          value={t.defaultDiscountCeiling}
                          onChange={(e) => updateTierCeiling(t.id, e.target.value)}
                          className="df-input w-full px-2.5 py-1.5 text-xs font-mono font-bold text-[var(--c-fg)]"
                        />
                        <span className="text-xs font-mono text-[var(--c-muted)]">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Product Category Ceilings */}
              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--c-rule)]">
                  <div>
                    <h2 className="font-semibold text-[var(--c-fg)] text-sm">Product Category Ceilings</h2>
                    <p className="text-xs text-[var(--c-subtle)] mt-0.5">
                      Thin-margin categories (Services) permit lower discretion than high-margin Hardware.
                    </p>
                  </div>
                  <Badge variant="primary">Blended Governance</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {categories.map(c => (
                    <div key={c.id} className="p-3.5 border border-[var(--c-rule)] bg-[var(--c-surface)] rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-[var(--c-fg)]">{c.name.toUpperCase()}</span>
                        <span className="text-[10px] font-mono text-[var(--c-subtle)]">CATEGORY LIMIT</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="100"
                          value={c.discountCeiling}
                          onChange={(e) => updateCategoryCeiling(c.id, e.target.value)}
                          className="df-input w-full px-2.5 py-1.5 text-xs font-mono font-bold text-[var(--c-fg)]"
                        />
                        <span className="text-xs font-mono text-[var(--c-muted)]">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Approval Chain Routing Brackets */}
              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--c-rule)]">
                  <div>
                    <h2 className="font-semibold text-[var(--c-fg)] text-sm">Approval Chain Routing Brackets</h2>
                    <p className="text-xs text-[var(--c-subtle)] mt-0.5">
                      Blended score determines whether Sales Rep, Manager, or Finance Ops sign-off is required.
                    </p>
                  </div>
                  <Badge variant="warning">Routing Matrix</Badge>
                </div>
                <div className="space-y-3">
                  {approvalRules.map(r => (
                    <div key={r.id} className="p-4 border border-[var(--c-rule)] bg-[var(--c-surface)] rounded-lg flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                            r.riskLevel === 'HIGH' ? 'bg-[var(--c-danger-bg)] text-[var(--c-danger)] border-[var(--c-danger-border)]' :
                            r.riskLevel === 'MEDIUM' ? 'bg-[var(--c-warning-bg)] text-[var(--c-warning)] border-[var(--c-warning-border)]' :
                            'bg-[var(--c-success-bg)] text-[var(--c-success)] border-[var(--c-success-border)]'
                          }`}>
                            {r.riskLevel} RISK
                          </span>
                          <span className="text-xs font-medium text-[var(--c-fg)]">
                            Required Sign-off: {Array.isArray(r.requiredSteps) ? r.requiredSteps.join(' → ') : JSON.stringify(r.requiredSteps)}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-[var(--c-subtle)] mt-1">
                          Score bracket: {r.minScore} to {r.maxScore}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-[var(--c-subtle)]">Min:</span>
                        <input
                          type="number"
                          step="1"
                          value={r.minScore}
                          onChange={(e) => updateRuleScore(r.id, 'minScore', e.target.value)}
                          className="df-input w-16 px-2 py-1 text-xs text-center"
                        />
                        <span className="text-[var(--c-subtle)]">Max:</span>
                        <input
                          type="number"
                          step="1"
                          value={r.maxScore}
                          onChange={(e) => updateRuleScore(r.id, 'maxScore', e.target.value)}
                          className="df-input w-16 px-2 py-1 text-xs text-center"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Upsell / Cross-Sell Rule Setup (PS Section A6 - Optional) */}
              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--c-rule)]">
                  <div>
                    <h2 className="font-semibold text-[var(--c-fg)] text-sm">Upsell &amp; Cross-Sell Recommendation Tuning</h2>
                    <p className="text-xs text-[var(--c-subtle)] mt-0.5">
                      Co-purchase ranking criteria and minimum margin safety threshold (PS Section A6)
                    </p>
                  </div>
                  <Badge variant="default">PS A6 Optional</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 border border-[var(--c-rule)] bg-[var(--c-surface)] rounded-lg space-y-2">
                    <label className="block text-[11px] font-mono uppercase text-[var(--c-subtle)]">Minimum Margin Threshold (%)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={minMarginThreshold}
                        onChange={(e) => setMinMarginThreshold(e.target.value)}
                        className="df-input w-full px-2.5 py-1.5 text-xs font-mono font-bold"
                      />
                      <span className="text-xs font-mono text-[var(--c-muted)]">%</span>
                    </div>
                    <p className="text-[10px] text-[var(--c-subtle)]">Recommendations below this margin are automatically suppressed.</p>
                  </div>
                  <div className="p-3.5 border border-[var(--c-rule)] bg-[var(--c-surface)] rounded-lg space-y-2">
                    <label className="block text-[11px] font-mono uppercase text-[var(--c-subtle)]">Promoted Product Score Multiplier</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max="5"
                        value={promotionBoost}
                        onChange={(e) => setPromotionBoost(e.target.value)}
                        className="df-input w-full px-2.5 py-1.5 text-xs font-mono font-bold"
                      />
                      <span className="text-xs font-mono text-[var(--c-muted)]">x</span>
                    </div>
                    <p className="text-[10px] text-[var(--c-subtle)]">Multiplies co-purchase affinity score for active campaign items.</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ── GENERAL ── */}
          {activeSection === 'general' && (
            <Card className="p-6 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-[var(--c-rule)]">
                <Globe className="w-4 h-4 text-[var(--c-muted)]" />
                <h2 className="font-semibold text-[var(--c-fg)] text-sm">Company &amp; Regional</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Company Name', value: 'DealFlow Enterprises' },
                  { label: 'Default Currency', value: 'INR (₹)' },
                  { label: 'Timezone', value: 'Asia/Kolkata (IST, +05:30)' },
                  { label: 'Fiscal Year Start', value: 'April 1st' },
                  { label: 'Date Format', value: 'DD MMM YYYY' },
                  { label: 'Platform Version', value: 'DealFlow360 v1.0' },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-[11px] font-mono text-[var(--c-subtle)] uppercase tracking-wider mb-1.5">{f.label}</label>
                    <input
                      className="df-input w-full px-3 py-2 text-xs font-mono"
                      defaultValue={f.value}
                      readOnly
                    />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ── SECURITY ── */}
          {activeSection === 'security' && (
            <Card className="p-6 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-[var(--c-rule)]">
                <Lock className="w-4 h-4 text-[var(--c-muted)]" />
                <h2 className="font-semibold text-[var(--c-fg)] text-sm">Security &amp; Authentication</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Auth Method', value: 'JWT Bearer Token' },
                  { label: 'Token Expiry', value: '7 days (configurable)' },
                  { label: 'Password Min Length', value: '8 characters' },
                  { label: 'Session Strategy', value: 'Stateless (JWT)' },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-[11px] font-mono text-[var(--c-subtle)] uppercase tracking-wider mb-1.5">{f.label}</label>
                    <input className="df-input w-full px-3 py-2 text-xs font-mono" defaultValue={f.value} readOnly />
                  </div>
                ))}
              </div>
              <div className="p-4 bg-[var(--c-success-bg)] border border-[var(--c-success-border)] rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-[var(--c-success)]" />
                  <span className="text-xs font-semibold text-[var(--c-success)] uppercase tracking-wider">RBAC Active</span>
                </div>
                <p className="text-xs text-[var(--c-muted)] mt-1 leading-relaxed">
                  Role-Based Access Control is active for all API endpoints. Middleware enforces role checks on every protected route.
                </p>
              </div>
            </Card>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeSection === 'notifications' && (
            <Card className="p-6 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-[var(--c-rule)]">
                <Bell className="w-4 h-4 text-[var(--c-muted)]" />
                <h2 className="font-semibold text-[var(--c-fg)] text-sm">Notification Preferences</h2>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Stalled deal alerts',          enabled: true  },
                  { label: 'Approval request notifications', enabled: true  },
                  { label: 'Discount anomaly warnings',     enabled: true  },
                  { label: 'Delivery slippage alerts',      enabled: true  },
                  { label: 'Payment overdue reminders',     enabled: true  },
                  { label: 'Weekly executive summary',      enabled: false },
                ].map(n => (
                  <div key={n.label} className="flex items-center justify-between px-4 py-3 border border-[var(--c-rule)] bg-[var(--c-surface)] rounded-lg">
                    <span className="text-xs text-[var(--c-fg)]">{n.label}</span>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                      n.enabled 
                        ? 'bg-[var(--c-success-bg)] text-[var(--c-success)] border-[var(--c-success-border)]' 
                        : 'bg-[var(--c-bg)] text-[var(--c-subtle)] border-[var(--c-rule)]'
                    }`}>
                      {n.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ── INTEGRATIONS ── */}
          {activeSection === 'integrations' && (
            <Card className="p-6 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-[var(--c-rule)]">
                <Zap className="w-4 h-4 text-[var(--c-muted)]" />
                <h2 className="font-semibold text-[var(--c-fg)] text-sm">Integration Status</h2>
              </div>
              <div className="space-y-2">
                {[
                  { name: 'REST API',          status: 'Active',      color: 'success', note: 'http://localhost:4000/api' },
                  { name: 'Prisma ORM + DB',   status: 'Connected',   color: 'success', note: 'SQLite' },
                  { name: 'Payment Gateway',   status: 'Live Mocked', color: 'success', note: 'Ready for production webhook attachment' },
                  { name: 'Reporting PDF/XLS', status: 'Active',      color: 'success', note: 'Server-rendered binary generator' },
                ].map(int => (
                  <div key={int.name} className="flex items-center justify-between px-4 py-3 border border-[var(--c-rule)] bg-[var(--c-surface)] rounded-lg">
                    <div>
                      <p className="text-xs text-[var(--c-fg)] font-medium">{int.name}</p>
                      <p className="text-[11px] font-mono text-[var(--c-muted)] mt-0.5">{int.note}</p>
                    </div>
                    <Badge variant={int.color}>{int.status}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ── USERS & ROLES ── */}
          {activeSection === 'users' && (
            <Card className="p-6 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-[var(--c-rule)]">
                <Users className="w-4 h-4 text-[var(--c-muted)]" />
                <h2 className="font-semibold text-[var(--c-fg)] text-sm">Roles &amp; Permissions</h2>
              </div>
              <div className="space-y-2">
                {PERMISSIONS.map(p => (
                  <div key={p.role} className="flex items-start space-x-3 px-4 py-3 border border-[var(--c-rule)] bg-[var(--c-surface)] rounded-lg">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-[var(--c-bg)] border border-[var(--c-rule)] text-[var(--c-fg)] rounded flex-shrink-0 uppercase tracking-wider">
                      {p.tag}
                    </span>
                    <p className="text-xs text-[var(--c-muted)] pt-0.5">{p.desc}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ── DATA & BACKUP ── */}
          {activeSection === 'data' && (
            <Card className="p-6 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-[var(--c-rule)]">
                <Database className="w-4 h-4 text-[var(--c-muted)]" />
                <h2 className="font-semibold text-[var(--c-fg)] text-sm">Data &amp; Audit</h2>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Audit Log Retention', value: '90 days', icon: Database },
                  { label: 'Database Engine',     value: 'Prisma ORM (SQLite)', icon: Server  },
                  { label: 'Exports Available',   value: 'PDF, XLS, CSV via Reports', icon: RefreshCw },
                ].map(d => (
                  <div key={d.label} className="flex items-center justify-between px-4 py-3 border border-[var(--c-rule)] bg-[var(--c-surface)] rounded-lg">
                    <div className="flex items-center space-x-3">
                      <d.icon className="w-4 h-4 text-[var(--c-subtle)]" />
                      <span className="text-xs text-[var(--c-muted)]">{d.label}</span>
                    </div>
                    <span className="text-xs font-mono font-medium text-[var(--c-fg)]">{d.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
