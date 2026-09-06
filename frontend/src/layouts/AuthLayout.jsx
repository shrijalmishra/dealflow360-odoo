import React from 'react';
import { Outlet } from 'react-router-dom';
import { Zap } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-[var(--c-bg)] text-[var(--c-fg)]">
      {/* Editorial Centered Container */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-[var(--c-surface)] border border-[var(--c-rule)] rounded-lg overflow-hidden">
          <div className="p-8">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded border border-[var(--c-rule)] bg-[var(--c-bg)] mb-3">
                <Zap className="w-5 h-5 text-[var(--c-fg)]" />
              </div>
              <h1 className="text-lg font-semibold text-[var(--c-fg)] tracking-tight">DealFlow360</h1>
              <p className="text-xs text-[var(--c-muted)] mt-1">Intelligent sales operations platform</p>
            </div>
            <Outlet />
          </div>
          <div className="px-8 py-3.5 border-t border-[var(--c-rule)] bg-[var(--c-bg)] text-center">
            <p className="text-[11px] font-mono text-[var(--c-subtle)]">Enterprise-grade · Self-governing · Real-time</p>
          </div>
        </div>
      </div>
    </div>
  );
}
