import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { customerRegister } from '../services/authApi';
import { Button } from '../components/common/UI';
import { Loader2, UserPlus, Building, Mail, Lock, CheckCircle2 } from 'lucide-react';

export default function CustomerSignup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Please provide an email and password.');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await customerRegister({
        name: formData.name || undefined,
        email: formData.email,
        password: formData.password,
        companyName: formData.companyName || undefined,
      });

      const token = res.token || res.data?.token;
      const customerId = res.customer?.id || res.data?.customer?.id;

      if (token) {
        localStorage.setItem('dealflow_customer_token', token);
        if (customerId) {
          localStorage.setItem('dealflow_customer_id', customerId);
        }
        setSuccess(true);
        setTimeout(() => {
          navigate('/customer/quotes/me');
        }, 1200);
      } else {
        setSuccess(true);
        setTimeout(() => {
          navigate('/customer/login');
        }, 1500);
      }
    } catch (err) {
      setError(err?.error?.message || err?.message || 'Customer registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[var(--c-bg)] text-[var(--c-fg)]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded border border-[var(--c-rule)] bg-[var(--c-surface)] mb-3">
          <UserPlus className="w-5 h-5 text-[var(--c-fg)]" />
        </div>
        <span className="text-[10px] font-mono text-[var(--c-subtle)] uppercase tracking-wider block mb-1">
          Client Portal / Self Registration
        </span>
        <h2 className="text-xl font-semibold tracking-tight text-[var(--c-fg)]">
          Create Customer Portal Account
        </h2>
        <p className="mt-1 text-xs text-[var(--c-muted)] max-w-xs mx-auto">
          Register to view quotes, request line revisions, negotiate terms, and confirm proposals online.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[var(--c-surface)] border border-[var(--c-rule)] rounded-lg p-6 sm:p-8">
          {error && (
            <div className="mb-5 bg-[var(--c-danger-bg)] border border-[var(--c-danger-border)] text-[var(--c-danger)] text-xs rounded p-3 font-mono">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 bg-[var(--c-accent-subtle)] border border-[var(--c-accent)] text-[var(--c-accent)] text-xs rounded p-3 font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Registration successful! Redirecting to customer portal...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--c-subtle)] mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Shaurya Ranjan"
                className="df-input w-full px-3 py-2 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--c-subtle)] mb-1.5">
                Company / Organization Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="e.g. Acme Technologies or New Venture"
                  className="df-input w-full px-3 py-2 text-xs font-mono"
                />
              </div>
              <p className="text-[10px] text-[var(--c-subtle)] mt-1">
                Enter your company name to automatically link with your account quotes.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--c-subtle)] mb-1.5">
                Work Email Address <span className="text-[var(--c-danger)]">*</span>
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="you@company.com"
                className="df-input w-full px-3 py-2 text-xs font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--c-subtle)] mb-1.5">
                  Password <span className="text-[var(--c-danger)]">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min 8 chars"
                  className="df-input w-full px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--c-subtle)] mb-1.5">
                  Confirm Password <span className="text-[var(--c-danger)]">*</span>
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-type password"
                  className="df-input w-full px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={loading || success}
              className="w-full py-2.5 mt-2 text-xs font-medium"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {loading ? 'Creating Account...' : 'Register & Access Portal'}
            </Button>
          </form>

          <div className="mt-5 pt-4 border-t border-[var(--c-rule)] text-center space-y-2">
            <p className="text-xs text-[var(--c-muted)]">
              Already have an account?{' '}
              <Link to="/customer/login" className="text-[var(--c-fg)] font-medium hover:underline">
                Sign In to Portal
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
