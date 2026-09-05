import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import InternalLayout from './layouts/InternalLayout';
import CustomerPortalLayout from './layouts/CustomerPortalLayout';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Quotations from './pages/Quotations';
import QuoteBuilder from './pages/QuoteBuilder';
import Pipeline from './pages/Pipeline';
import Approvals from './pages/Approvals';
import Fulfillment from './pages/Fulfillment';
import Billing from './pages/Billing';
import Reports from './pages/Reports';
import CustomerPortal from './pages/CustomerPortal';
import FinanceApprovals from './pages/FinanceApprovals';
import OperationsDashboard from './pages/OperationsDashboard';
import Orders from './pages/Orders';
import Warehouses from './pages/Warehouses';
import Inventory from './pages/Inventory';
import Backorders from './pages/Backorders';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect root to dashboard (or login based on auth logic later) */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Route>

        {/* Internal Application Routes */}
        <Route element={<InternalLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/ops-dashboard" element={<OperationsDashboard />} />
          <Route path="/quotations" element={<Quotations />} />
          <Route path="/quotations/:quoteId" element={<QuoteBuilder />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/approvals/:quoteId" element={<Approvals />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/finance-approvals" element={<FinanceApprovals />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/warehouses" element={<Warehouses />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/backorders" element={<Backorders />} />
          <Route path="/fulfillment" element={<Fulfillment />} />
          <Route path="/fulfillment/:orderId" element={<Fulfillment />} />
          <Route path="/billing/:orderId" element={<Billing />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<div className="p-6 text-gray-500 font-medium">Settings coming soon...</div>} />
        </Route>

        {/* Customer Portal Route */}
        <Route element={<CustomerPortalLayout />}>
          <Route path="/customer/quotes/:token" element={<CustomerPortal />} />
        </Route>
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;
