import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../services/authApi';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('sarah@dealflow360.com');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const res = await login(email, password);
      localStorage.setItem('dealflow_token', res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err?.error?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-3">
          {error}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary-600 text-white py-2.5 rounded-md font-medium text-sm hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        {loading ? 'Signing in...' : 'Sign In'}
      </button>

      {/* Quick Login Helpers for Demo */}
      <div className="pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 mb-2 text-center uppercase tracking-wider font-semibold">Demo Accounts</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setEmail('sarah@dealflow360.com')} className="text-xs py-1.5 border border-gray-300 rounded hover:bg-gray-50">Sales Rep</button>
          <button type="button" onClick={() => setEmail('manager@dealflow360.com')} className="text-xs py-1.5 border border-gray-300 rounded hover:bg-gray-50">Manager</button>
          <button type="button" onClick={() => setEmail('finance@dealflow360.com')} className="text-xs py-1.5 border border-gray-300 rounded hover:bg-gray-50">Finance / Ops</button>
          <button type="button" onClick={() => setEmail('admin@dealflow360.com')} className="text-xs py-1.5 border border-gray-300 rounded hover:bg-gray-50">Admin</button>
        </div>
        <div className="mt-3 text-center">
          <Link to="/customer/quotes/demo-token-123" className="text-xs text-primary-600 hover:underline">
            View Customer Portal Demo &rarr;
          </Link>
        </div>
      </div>

      <p className="text-center text-sm text-gray-500 pt-2">
        Don't have an account?{' '}
        <Link to="/signup" className="text-primary-600 hover:underline font-medium">Sign Up</Link>
      </p>
    </form>
  );
}
