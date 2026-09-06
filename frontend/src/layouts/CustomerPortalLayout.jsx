import React from 'react';
import { Outlet } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export default function CustomerPortalLayout() {
  return (
    <div className="min-h-screen flex flex-col text-xs bg-[var(--c-bg)] text-[var(--c-fg)]">
      {/* Editorial Top Navigation */}
      <header className="h-14 border-b border-[var(--c-rule)] bg-[var(--c-surface)] flex items-center justify-between px-6 z-20">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 rounded border border-[var(--c-rule)] bg-[var(--c-bg)] flex items-center justify-center text-[var(--c-fg)]">
            <ShieldCheck className="w-4 h-4 text-[var(--c-fg)]" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="font-semibold text-[var(--c-fg)] text-sm tracking-tight">
              DealFlow360
            </span>
            <span className="text-[10px] font-mono text-[var(--c-subtle)] uppercase tracking-wider">
              Partner Portal
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-[11px] font-mono text-[var(--c-muted)] hidden sm:inline">Secure Commercial Workspace</span>
          <span className="px-2 py-0.5 bg-[var(--c-success-bg)] text-[var(--c-success)] text-[10px] font-mono rounded border border-[var(--c-success-border)] uppercase tracking-wider">
            Authenticated
          </span>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('dealflow_customer_token');
              localStorage.removeItem('dealflow_customer_id');
              window.location.href = '/customer/login';
            }}
            className="text-[11px] font-mono text-[var(--c-muted)] hover:text-[var(--c-fg)] border border-[var(--c-rule)] hover:border-[var(--c-fg)] px-2.5 py-1 rounded transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-8">
        <Outlet />
      </main>
      
      <footer className="py-6 text-center text-[var(--c-subtle)] font-mono text-[11px] border-t border-[var(--c-rule)] mt-auto">
        &copy; {new Date().getFullYear()} DealFlow360 Enterprise Governance. All rights reserved.
      </footer>
    </div>
  );
}
