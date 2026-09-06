import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { customerLogin } from '../services/authApi';
import { Button } from '../components/common/UI';
import { Loader2, ShieldCheck } from 'lucide-react';

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const performLogin = async (loginEmail, loginPassword) => {
    if (!loginEmail || !loginPassword) {
      setError('Please enter your email and password.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const res = await customerLogin(loginEmail, loginPassword);
      const token = res.token || res.data?.token;
      const customerId = res.customer?.id || res.data?.customer?.id;
      if (token) {
        localStorage.setItem('dealflow_customer_token', token);
        if (customerId) {
          localStorage.setItem('dealflow_customer_id', customerId);
        }
        navigate('/customer/quotes/me');
      } else {
        setError('Login failed. Please check credentials.');
      }
    } catch (err) {
      setError(err?.error?.message || err?.message || 'Invalid customer credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    performLogin(email, password);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[var(--c-bg)] text-[var(--c-fg)]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded border border-[var(--c-rule)] bg-[var(--c-surface)] mb-3">
          <ShieldCheck className="w-5 h-5 text-[var(--c-fg)]" />
        </div>
        <span className="text-[10px] font-mono text-[var(--c-subtle)] uppercase tracking-wider block mb-1">
          Client Portal / Access
        </span>
        <h2 className="text-xl font-semibold tracking-tight text-[var(--c-fg)]">
          Customer Quotation Portal
        </h2>
        <p className="mt-1 text-xs text-[var(--c-muted)] max-w-xs mx-auto">
          Sign in to review verified quotes, negotiate terms, and confirm commercial agreements securely.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[var(--c-surface)] border border-[var(--c-rule)] rounded-lg p-6 sm:p-8">
          {error && (
            <div className="mb-5 bg-[var(--c-danger-bg)] border border-[var(--c-danger-border)] text-[var(--c-danger)] text-xs rounded p-3 font-mono">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--c-subtle)] mb-1.5">
                Customer Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@company.com"
                className="df-input w-full px-3 py-2 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--c-subtle)] mb-1.5">
                Portal Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="df-input w-full px-3 py-2 text-xs font-mono"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full py-2.5 mt-2 text-xs font-medium"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {loading ? 'Authenticating...' : 'Access Portal Securely'}
            </Button>
          </form>

          {/* Demo quick-fill */}
          <div className="mt-4 pt-4 border-t border-[var(--c-rule)]">
            <p className="text-[10px] font-mono text-[var(--c-subtle)] uppercase tracking-wider text-center mb-2">Instant Demo Quick-Login</p>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setEmail('customer@acme.dealflow360.test');
                setPassword('Customer@12345');
                performLogin('customer@acme.dealflow360.test', 'Customer@12345');
              }}
              className="w-full text-xs py-2 rounded-lg border border-[var(--c-rule)] bg-[var(--c-bg)] text-[var(--c-fg)] hover:border-[var(--c-fg)] transition-all duration-150 font-medium font-mono flex items-center justify-center gap-2 shadow-sm"
            >
              <span>{loading ? 'Authenticating...' : 'Acme Technologies (Gold Tier) \u2192'}</span>
            </button>
          </div>

          <div className="mt-5 pt-4 border-t border-[var(--c-rule)] text-center space-y-2">
            <p className="text-xs text-[var(--c-muted)]">
              New client?{' '}
              <Link to="/customer/signup" className="text-[var(--c-fg)] font-medium hover:underline">
                Create Portal Account
              </Link>
            </p>
            <div>
              <Link to="/login" className="text-xs text-[var(--c-subtle)] hover:text-[var(--c-fg)] transition-colors">
                &larr; Return to Internal Staff Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
