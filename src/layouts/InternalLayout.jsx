import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, FileText, Kanban, CheckSquare, 
  Truck, CreditCard, BarChart2, Settings,
  Search, Bell, User, RefreshCw, Server, X
} from 'lucide-react';

const SIDEBAR_NAV = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Quotations', path: '/quotations', icon: FileText },
  { name: 'Pipeline', path: '/pipeline', icon: Kanban },
  { name: 'Approvals', path: '/approvals', icon: CheckSquare },
  { name: 'Fulfillment', path: '/fulfillment', icon: Truck },
  { name: 'Billing', path: '/billing', icon: CreditCard },
  { name: 'Reports', path: '/reports', icon: BarChart2 },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function InternalLayout() {
  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden text-sm">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-gray-900 text-gray-300 flex flex-col flex-shrink-0">
        <div className="h-14 flex items-center px-4 font-bold text-white tracking-wider border-b border-gray-800">
          DEALFLOW360
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {SIDEBAR_NAV.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-md transition-colors ${
                  isActive ? 'bg-primary-600 text-white' : 'hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <item.icon className="w-4 h-4 mr-3" />
              {item.name}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP NAVIGATION */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center flex-1">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search quotes, customers..."
                className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-6">
            {/* Workspace Actions */}
            <div className="flex items-center space-x-2 border-r border-gray-200 pr-6">
              <button className="flex items-center text-gray-600 hover:text-gray-900 text-xs font-medium">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Reload Data
              </button>
              <button className="flex items-center text-gray-600 hover:text-gray-900 text-xs font-medium">
                <Server className="w-3.5 h-3.5 mr-1.5" />
                Go to Back-end
              </button>
              <button className="flex items-center text-gray-600 hover:text-gray-900 text-xs font-medium">
                <X className="w-3.5 h-3.5 mr-1.5" />
                Close Workspace
              </button>
            </div>

            {/* Profile & Notifications */}
            <div className="flex items-center space-x-4">
              <button className="text-gray-500 hover:text-gray-700 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-900">Sarah Sales</span>
                  <span className="text-[10px] text-gray-500 uppercase">Sales Rep</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
