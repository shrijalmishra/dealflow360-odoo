import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQuotes } from '../services/quoteApi';
import { Card, Button, StatusBadge } from '../components/common/UI';
import { formatMoney, formatDate } from '../utils/formatters';
import { Search, Plus, Loader2, AlertTriangle, FileText } from 'lucide-react';

export default function Quotations() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('updated');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getQuotes();
        setQuotes(res.data);
      } catch (err) {
        setError(err?.error?.message || 'Failed to load quotations.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Client-side filtering (backend would handle this in production)
  const filtered = quotes
    .filter((q) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          q.quoteNumber.toLowerCase().includes(term) ||
          q.customerName.toLowerCase().includes(term) ||
          q.assignedRep?.toLowerCase().includes(term)
        );
      }
      return true;
    })
    .filter((q) => {
      if (statusFilter) return q.status === statusFilter;
      return true;
    })
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (sortDir === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIndicator = ({ field }) => {
    if (sortField !== field) return null;
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400 mr-3" />
        <p className="text-gray-500">Loading quotations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <AlertTriangle className="w-10 h-10 text-red-400" />
        <p className="text-red-600">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
        <Button variant="primary" onClick={() => navigate('/quotations/new')}>
          <Plus className="w-4 h-4 mr-2" /> New Quote
        </Button>
      </div>

      {/* SEARCH & FILTERS */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search quotes, customers, reps..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="SENT">Sent</option>
            <option value="UNDER_NEGOTIATION">Under Negotiation</option>
            <option value="CONFIRMED">Confirmed</option>
          </select>
        </div>
      </Card>

      {/* QUOTATIONS TABLE */}
      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <FileText className="w-10 h-10 mb-3" />
            <p className="text-sm">No quotations found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left cursor-pointer hover:text-gray-700" onClick={() => handleSort('quoteNumber')}>
                  Quote # <SortIndicator field="quoteNumber" />
                </th>
                <th className="px-6 py-3 text-left cursor-pointer hover:text-gray-700" onClick={() => handleSort('customerName')}>
                  Customer <SortIndicator field="customerName" />
                </th>
                <th className="px-6 py-3 text-right cursor-pointer hover:text-gray-700" onClick={() => handleSort('grandTotal')}>
                  Amount <SortIndicator field="grandTotal" />
                </th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-center">Approval</th>
                <th className="px-6 py-3 text-left cursor-pointer hover:text-gray-700" onClick={() => handleSort('created')}>
                  Created <SortIndicator field="created" />
                </th>
                <th className="px-6 py-3 text-left cursor-pointer hover:text-gray-700" onClick={() => handleSort('updated')}>
                  Updated <SortIndicator field="updated" />
                </th>
                <th className="px-6 py-3 text-left">Rep</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q) => (
                <tr
                  key={q.id}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/quotations/${q.id}`)}
                >
                  <td className="px-6 py-4 font-semibold text-primary-600">{q.quoteNumber}</td>
                  <td className="px-6 py-4 text-gray-900">{q.customerName}</td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">{formatMoney(q.grandTotal)}</td>
                  <td className="px-6 py-4 text-center"><StatusBadge status={q.status} /></td>
                  <td className="px-6 py-4 text-center"><StatusBadge status={q.approval?.status || 'NOT_REQUIRED'} /></td>
                  <td className="px-6 py-4 text-gray-500">{formatDate(q.created)}</td>
                  <td className="px-6 py-4 text-gray-500">{formatDate(q.updated)}</td>
                  <td className="px-6 py-4 text-gray-600">{q.assignedRep}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
