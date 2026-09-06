import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../services/authApi';
import { Loader2, Mail, Lock, AlertCircle } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('rep@dealflow360.test');
  const [password, setPassword] = useState('Rep@12345');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setCredentials = (em, pw) => { setEmail(em); setPassword(pw); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Email and password are required.'); return; }
    try {
      setLoading(true);
      setError('');
      const res = await login(email, password);
      const token = res.token || res.data?.token;
      const user  = res.user  || res.data?.user;
      if (token) localStorage.setItem('dealflow_token', token);
      if (user)  localStorage.setItem('dealflow_user', JSON.stringify(user));
      navigate('/dashboard');
    } catch (err) {
      setError(err?.error?.message || err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-start space-x-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg p-3">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-[var(--c-muted)] uppercase tracking-wider">Email</label>
        <div className="relative">
          <Mail className="absolute left-3 top-2.5 w-4 h-4 text-[var(--c-subtle)] pointer-events-none" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="df-input w-full pl-10 pr-4 py-2.5 text-sm"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-[var(--c-muted)] uppercase tracking-wider">Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-2.5 w-4 h-4 text-[var(--c-subtle)] pointer-events-none" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="df-input w-full pl-10 pr-4 py-2.5 text-sm"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[var(--c-fg)] text-[var(--c-bg)] py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center space-x-2 hover:bg-[var(--c-muted)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        <span>{loading ? 'Signing in...' : 'Sign In'}</span>
      </button>

      {/* Quick login helpers */}
      <div className="pt-3 border-t border-[var(--c-rule)]">
        <p className="text-xs text-[var(--c-subtle)] mb-2.5 text-center font-medium tracking-wider uppercase">Live Seeded Accounts</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Sales Rep',    em: 'rep@dealflow360.test',     pw: 'Rep@12345' },
            { label: 'Manager',      em: 'manager@dealflow360.test', pw: 'Manager@12345' },
            { label: 'Finance Ops',  em: 'finance@dealflow360.test', pw: 'Finance@12345' },
            { label: 'Admin',        em: 'admin@dealflow360.test',   pw: 'Admin@12345' },
          ].map(({ label, em, pw }) => (
            <button
              key={label}
              type="button"
              onClick={() => setCredentials(em, pw)}
              className="text-xs py-1.5 rounded-lg border border-[var(--c-rule)] text-[var(--c-muted)] hover:border-[var(--c-fg)] hover:text-[var(--c-fg)] transition-all duration-150 font-medium"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-[var(--c-subtle)] pt-1">
        Don't have an account?{' '}
        <Link to="/signup" className="text-[var(--c-fg)] hover:underline font-medium transition-colors">Sign Up</Link>
      </p>
    </form>
  );
}
