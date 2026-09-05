import React from 'react';
import { Outlet } from 'react-router-dom';

export default function CustomerPortalLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-sm">
      {/* ISOLATED TOP NAVIGATION */}
      <header className="h-16 bg-white border-b border-gray-200 shadow-sm flex items-center justify-between px-8">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary-600 rounded-md flex items-center justify-center text-white font-bold">
            D
          </div>
          <span className="font-bold text-gray-900 text-lg">DealFlow360 Partner Portal</span>
        </div>
        <div className="flex items-center">
          <span className="text-gray-500 mr-2">Secure Negotiation Environment</span>
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full border border-green-200">
            Authenticated
          </span>
        </div>
      </header>

      {/* ISOLATED PAGE CONTENT */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-8">
        <Outlet />
      </main>
      
      <footer className="py-6 text-center text-gray-400 text-xs border-t border-gray-200 mt-auto">
        &copy; {new Date().getFullYear()} DealFlow360. All rights reserved.
      </footer>
    </div>
  );
}
