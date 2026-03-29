import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { exportInvoicePDF } from '@/lib/pdfExport';
import { Receipt, Plus, Search, ArrowUpDown, Trash2, Edit, CheckCircle, FileDown } from 'lucide-react';
import { toast } from 'sonner';

const InvoiceList: React.FC = () => {
  const { invoices, customers, deleteInvoice, updateInvoice, setCurrentView, setEditingId } = useAppContext();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'total' | 'due'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    let result = [...invoices];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.customerName.toLowerCase().includes(q) ||
        i.number.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') result = result.filter(i => i.status === statusFilter);
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'date') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sortBy === 'total') cmp = a.total - b.total;
      else cmp = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return result;
  }, [invoices, search, statusFilter, sortBy, sortDir]);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  const handleExportPDF = (invId: string) => {
    const inv = invoices.find(i => i.id === invId);
    if (!inv) return;
    const cust = customers.find(c => c.id === inv.customerId) || null;
    try {
      exportInvoicePDF(inv, cust);
      toast.success('PDF exported');
    } catch {
      toast.error('Export failed');
    }
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-600/20 text-slate-400',
    sent: 'bg-blue-500/20 text-blue-400',
    paid: 'bg-green-500/20 text-green-400',
    overdue: 'bg-red-500/20 text-red-400',
    cancelled: 'bg-slate-500/20 text-slate-500',
  };

  const markPaid = (id: string) => {
    updateInvoice(id, { status: 'paid', paidDate: new Date().toISOString() });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Invoices</h2>
          <p className="text-slate-400 text-sm">{invoices.length} total invoices</p>
        </div>
        <button
          onClick={() => { setCurrentView('invoice-editor'); setEditingId(null); }}
          className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2"
        >
          <Plus size={18} /> New Invoice
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <div className="flex gap-1">
          {(['date', 'total', 'due'] as const).map(f => (
            <button key={f} onClick={() => toggleSort(f)}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-1 ${
                sortBy === f ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}>
              {f === 'date' ? 'Date' : f === 'total' ? 'Total' : 'Due'}
              {sortBy === f && <ArrowUpDown size={12} />}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <Receipt size={48} className="mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400">No invoices found</p>
          </div>
        ) : (
          filtered.map(inv => (
            <div key={inv.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-800 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-white font-semibold">{inv.title}</span>
                    <span className="text-slate-500 text-sm">{inv.number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[inv.status]}`}>
                      {inv.status}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm">{inv.customerName}</p>
                  <p className="text-slate-500 text-xs mt-1">
                    Due: {new Date(inv.dueDate).toLocaleDateString()}
                    {inv.paidDate && ` | Paid: ${new Date(inv.paidDate).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-white font-bold text-lg">${inv.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700/50 flex-wrap">
                <button onClick={() => { setCurrentView('invoice-editor'); setEditingId(inv.id); }}
                  className="px-3 py-1.5 bg-slate-700/50 text-slate-300 rounded-lg text-sm hover:bg-slate-700 transition-colors flex items-center gap-1">
                  <Edit size={14} /> Edit
                </button>
                <button
                  onClick={() => handleExportPDF(inv.id)}
                  className="px-3 py-1.5 bg-sky-500/10 text-sky-400 rounded-lg text-sm hover:bg-sky-500/20 transition-colors flex items-center gap-1"
                >
                  <FileDown size={14} /> PDF
                </button>
                {(inv.status === 'sent' || inv.status === 'overdue') && (
                  <button onClick={() => markPaid(inv.id)}
                    className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30 transition-colors flex items-center gap-1">
                    <CheckCircle size={14} /> Mark Paid
                  </button>
                )}
                <div className="flex-1" />
                <button onClick={() => deleteInvoice(inv.id)}
                  className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-sm hover:bg-red-500/20 transition-colors flex items-center gap-1">
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

export default InvoiceList;
