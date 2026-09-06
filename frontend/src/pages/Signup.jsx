import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signup } from '../services/authApi';
import { Loader2, AlertCircle, User, Mail, Lock, Briefcase } from 'lucide-react';

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('SALES_REP');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('All fields are required.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await signup({ name, email, password, role });
      navigate('/login');
    } catch (err) {
      setError(err?.error?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-start space-x-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg p-3">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-[11px] font-mono text-[var(--c-subtle)] uppercase tracking-wider">Full Name</label>
        <div className="relative">
          <User className="absolute left-3 top-2.5 w-4 h-4 text-[var(--c-subtle)] pointer-events-none" />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            className="df-input w-full pl-9 pr-3 py-2 text-xs"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-[11px] font-mono text-[var(--c-subtle)] uppercase tracking-wider">Email</label>
        <div className="relative">
          <Mail className="absolute left-3 top-2.5 w-4 h-4 text-[var(--c-subtle)] pointer-events-none" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="df-input w-full pl-9 pr-3 py-2 text-xs font-mono"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-[11px] font-mono text-[var(--c-subtle)] uppercase tracking-wider">Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-2.5 w-4 h-4 text-[var(--c-subtle)] pointer-events-none" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="df-input w-full pl-9 pr-3 py-2 text-xs font-mono"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-[11px] font-mono text-[var(--c-subtle)] uppercase tracking-wider">Role</label>
        <div className="relative">
          <Briefcase className="absolute left-3 top-2.5 w-4 h-4 text-[var(--c-subtle)] pointer-events-none" />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="df-input w-full pl-9 pr-3 py-2 text-xs bg-[var(--c-surface)] text-[var(--c-fg)]"
          >
            <option value="SALES_REP">Sales Rep</option>
            <option value="SALES_MANAGER">Sales Manager</option>
            <option value="FINANCE">Finance</option>
            <option value="OPERATIONS">Operations</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[var(--c-fg)] text-[var(--c-bg)] py-2.5 rounded-lg font-semibold text-xs flex items-center justify-center space-x-2 hover:bg-[var(--c-muted)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        <span>{loading ? 'Creating account...' : 'Create Account'}</span>
      </button>

      <p className="text-center text-xs text-[var(--c-subtle)] pt-1">
        Already have an account?{' '}
        <Link to="/login" className="text-[var(--c-fg)] hover:underline font-medium">Sign In</Link>
      </p>
    </form>
  );
}
