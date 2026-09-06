import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Bell, LogOut, RefreshCw } from 'lucide-react';
import { me } from '../services/authApi';

const NAV_SECTIONS = [
  {
    title: 'SALES',
    items: [
      { num: '01', name: 'Dashboard',          path: '/dashboard',   roles: ['SALES_REP', 'SALES_MANAGER', 'ADMIN'] },
      { num: '02', name: 'Quotations',         path: '/quotations',  roles: ['SALES_REP', 'ADMIN'] },
      { num: '03', name: 'Pipeline',           path: '/pipeline',    roles: ['SALES_REP', 'SALES_MANAGER', 'ADMIN'] },
      { num: '04', name: 'Customers',          path: '/customers',   roles: ['SALES_REP', 'SALES_MANAGER', 'ADMIN'] },
      { num: '05', name: 'Products & Pricing', path: '/products',    roles: ['SALES_REP', 'SALES_MANAGER', 'ADMIN'] },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { num: '06', name: 'Orders',        path: '/orders',        roles: ['FINANCE_OPS', 'OPERATIONS', 'ADMIN'] },
      { num: '07', name: 'Fulfillment',   path: '/fulfillment',   roles: ['FINANCE_OPS', 'OPERATIONS', 'ADMIN'] },
      { num: '08', name: 'Inventory',     path: '/inventory',     roles: ['FINANCE_OPS', 'OPERATIONS', 'ADMIN'] },
      { num: '09', name: 'Warehouses',    path: '/warehouses',    roles: ['FINANCE_OPS', 'OPERATIONS', 'ADMIN'] },
      { num: '10', name: 'Backorders',    path: '/backorders',    roles: ['FINANCE_OPS', 'OPERATIONS', 'ADMIN'] },
    ],
  },
  {
    title: 'FINANCE',
    items: [
      { num: '11', name: 'Approvals',         path: '/approvals',         roles: ['SALES_MANAGER', 'ADMIN'] },
      { num: '12', name: 'Finance Approvals', path: '/finance-approvals', roles: ['FINANCE_OPS', 'FINANCE', 'ADMIN'] },
      { num: '13', name: 'Billing',           path: '/billing',           roles: ['FINANCE_OPS', 'FINANCE', 'ADMIN'] },
      { num: '14', name: 'Subscriptions',     path: '/subscriptions',     roles: ['FINANCE_OPS', 'FINANCE', 'SALES_MANAGER', 'ADMIN'] },
      { num: '15', name: 'Reports',           path: '/reports',           roles: ['SALES_MANAGER', 'FINANCE_OPS', 'FINANCE', 'ADMIN'] },
    ],
  },
  {
    title: 'INTELLIGENCE',
    items: [
      { num: '16', name: 'Deal Health',   path: '/deal-health',   roles: ['SALES_MANAGER', 'ADMIN'] },
      { num: '17', name: 'Ops Telemetry', path: '/ops-dashboard', roles: ['FINANCE_OPS', 'OPERATIONS', 'ADMIN'] },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { num: '18', name: 'Settings', path: '/settings', roles: ['SALES_REP', 'SALES_MANAGER', 'FINANCE_OPS', 'FINANCE', 'OPERATIONS', 'ADMIN'] },
    ],
  },
];

function canAccess(user, roles) {
  if (!user?.role) return false;
  if (user.role === 'ADMIN') return true;
  if (user.role === 'FINANCE_OPS' && (roles.includes('FINANCE') || roles.includes('OPERATIONS') || roles.includes('FINANCE_OPS'))) return true;
  return roles.includes(user.role);
}

export default function InternalLayout() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await me();
        setUser(res.data);
      } catch {
        navigate('/login');
      }
    };
    fetchUser();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('dealflow_token');
    localStorage.removeItem('dealflow_user');
    navigate('/login');
  };

  // Derive current section name for breadcrumbs
  const currentPath = location.pathname;
  let currentTitle = 'Platform';
  for (const sec of NAV_SECTIONS) {
    for (const it of sec.items) {
      if (currentPath.startsWith(it.path)) {
        currentTitle = `${sec.title} / ${it.name}`;
      }
    }
  }

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex items-center space-x-3 text-zinc-500 font-mono-num text-xs">
          <RefreshCw className="w-4 h-4 animate-spin text-zinc-400" />
          <span>INITIALIZING WORKSPACE...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0a0a0a] text-[#f5f5f5]">
      {/* ── SIDEBAR ── */}
      <aside className="editorial-sidebar w-56 flex flex-col flex-shrink-0">
        {/* Masthead */}
        <div className="h-13 flex items-center justify-between px-4 flex-shrink-0 border-b border-[#1f1f1f]">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-white tracking-widest text-xs uppercase font-mono-num">
              DEALFLOW360
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono-num tracking-wider">
            (v2.6)
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {NAV_SECTIONS.map((section) => {
            const visible = section.items.filter((item) => canAccess(user, item.roles));
            if (!visible.length) return null;
            return (
              <div key={section.title}>
                <p className="section-title">{section.title}</p>
                <div className="space-y-0.5">
                  {visible.map((item) => (
                    <NavLink
                      key={item.name}
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center px-2.5 py-1.5 text-xs transition-colors duration-100 rounded-sm font-mono-num ${
                          isActive
                            ? 'nav-active text-white'
                            : 'nav-inactive text-zinc-400 hover:text-white'
                        }`
                      }
                    >
                      <span className="w-5 text-zinc-500 text-[11px] font-mono-num select-none">
                        {item.num}
                      </span>
                      <span className="truncate font-normal tracking-wide text-xs">{item.name}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User Status at Bottom */}
        <div className="p-3 border-t border-[#1f1f1f] flex-shrink-0 bg-[#0a0a0a]">
          <div className="flex items-center justify-between px-1">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-zinc-200 truncate">{user?.name}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono-num mt-0.5">
                {user?.role?.replace(/_/g, ' ')}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN WORKSPACE ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0a0a0a]">
        {/* Top Header */}
        <header className="editorial-header h-13 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <span className="text-[11px] text-zinc-400 font-mono-num tracking-wider uppercase">
              {currentTitle}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-1.5 text-zinc-400 hover:text-white transition-colors relative">
              <Bell className="w-3.5 h-3.5" />
            </button>
            <div className="h-3 w-px bg-zinc-800" />
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-zinc-300 font-mono-num font-medium">
                {user?.email}
              </span>
            </div>
          </div>
        </header>

        {/* Workspace Canvas */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#0a0a0a]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
