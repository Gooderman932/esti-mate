import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { exportEstimatePDF } from '@/lib/pdfExport';
import { FileText, Plus, Search, ArrowUpDown, Trash2, Edit, ArrowRightLeft, FileDown } from 'lucide-react';
import { toast } from 'sonner';

const EstimateList: React.FC = () => {
  const { estimates, customers, deleteEstimate, convertToInvoice, setCurrentView, setEditingId } = useAppContext();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'total' | 'name'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    let result = [...estimates];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.customerName.toLowerCase().includes(q) ||
        e.number.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter(e => e.status === statusFilter);
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'date') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sortBy === 'total') cmp = a.total - b.total;
      else cmp = a.title.localeCompare(b.title);
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return result;
  }, [estimates, search, statusFilter, sortBy, sortDir]);

  const toggleSort = (field: 'date' | 'total' | 'name') => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  const handleExportPDF = (estId: string) => {
    const est = estimates.find(e => e.id === estId);
    if (!est) return;
    const cust = customers.find(c => c.id === est.customerId) || null;
    try {
      exportEstimatePDF(est, cust);
      toast.success('PDF exported');
    } catch {
      toast.error('Export failed');
    }
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-600/20 text-slate-400',
    sent: 'bg-blue-500/20 text-blue-400',
    approved: 'bg-green-500/20 text-green-400',
    rejected: 'bg-red-500/20 text-red-400',
    invoiced: 'bg-purple-500/20 text-purple-400',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Estimates</h2>
          <p className="text-slate-400 text-sm">{estimates.length} total estimates</p>
        </div>
        <button
          onClick={() => { setCurrentView('estimate-editor'); setEditingId(null); }}
          className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg shadow-orange-500/25 flex items-center gap-2"
        >
          <Plus size={18} /> New Estimate
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search estimates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="invoiced">Invoiced</option>
        </select>
        <div className="flex gap-1">
          {(['date', 'total', 'name'] as const).map(f => (
            <button
              key={f}
              onClick={() => toggleSort(f)}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-1 ${
                sortBy === f ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {f === 'date' ? 'Date' : f === 'total' ? 'Total' : 'Name'}
              {sortBy === f && <ArrowUpDown size={12} />}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <FileText size={48} className="mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400">No estimates found</p>
          </div>
        ) : (
          filtered.map(est => (
            <div
              key={est.id}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-white font-semibold">{est.title}</span>
                    <span className="text-slate-500 text-sm">{est.number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[est.status]}`}>
                      {est.status}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm">{est.customerName}</p>
                  <p className="text-slate-500 text-xs mt-1">
                    {est.lineItems.length} items &middot; Created {new Date(est.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-white font-bold text-lg">${est.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  <p className="text-slate-500 text-xs">Tax: {est.taxRate}%</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700/50 flex-wrap">
                <button
                  onClick={() => { setCurrentView('estimate-editor'); setEditingId(est.id); }}
                  className="px-3 py-1.5 bg-slate-700/50 text-slate-300 rounded-lg text-sm hover:bg-slate-700 transition-colors flex items-center gap-1"
                >
                  <Edit size={14} /> Edit
                </button>
                <button
                  onClick={() => handleExportPDF(est.id)}
                  className="px-3 py-1.5 bg-sky-500/10 text-sky-400 rounded-lg text-sm hover:bg-sky-500/20 transition-colors flex items-center gap-1"
                >
                  <FileDown size={14} /> PDF
                </button>
                {est.status === 'approved' && (
                  <button
                    onClick={() => convertToInvoice(est.id)}
                    className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/30 transition-colors flex items-center gap-1"
                  >
                    <ArrowRightLeft size={14} /> Convert to Invoice
                  </button>
                )}
                <div className="flex-1" />
                <button
                  onClick={() => deleteEstimate(est.id)}
                  className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-sm hover:bg-red-500/20 transition-colors flex items-center gap-1"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EstimateList;
