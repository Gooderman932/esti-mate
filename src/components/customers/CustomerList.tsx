import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Customer } from '@/types';
import { Users, Plus, Search, Trash2, Edit, X, Save, Mail, Phone, MapPin } from 'lucide-react';

const emptyCustomer = { name: '', email: '', phone: '', address: '', city: '', state: '', zip: '', notes: '' };

const CustomerList: React.FC = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useAppContext();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyCustomer);

  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const openAdd = () => { setForm(emptyCustomer); setEditId(null); setShowForm(true); };
  const openEdit = (c: Customer) => {
    setForm({ name: c.name, email: c.email, phone: c.phone, address: c.address, city: c.city, state: c.state, zip: c.zip, notes: c.notes });
    setEditId(c.id);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editId) {
      updateCustomer(editId, form);
    } else {
      addCustomer(form);
    }
    setShowForm(false);
    setForm(emptyCustomer);
    setEditId(null);
  };

  const updateField = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Customers</h2>
          <p className="text-slate-400 text-sm">{customers.length} total customers</p>
        </div>
        <button onClick={openAdd}
          className="px-4 py-2.5 bg-gradient-to-r from-violet-500 to-violet-600 text-white font-semibold rounded-xl hover:from-violet-600 hover:to-violet-700 transition-all shadow-lg shadow-violet-500/25 flex items-center gap-2">
          <Plus size={18} /> Add Customer
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold text-lg">{editId ? 'Edit Customer' : 'New Customer'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-sm block mb-1">Name *</label>
                <input value={form.name} onChange={e => updateField('name', e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50" placeholder="Full name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 text-sm block mb-1">Email</label>
                  <input value={form.email} onChange={e => updateField('email', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50" placeholder="email@example.com" />
                </div>
                <div>
                  <label className="text-slate-400 text-sm block mb-1">Phone</label>
                  <input value={form.phone} onChange={e => updateField('phone', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50" placeholder="(555) 000-0000" />
                </div>
              </div>
              <div>
                <label className="text-slate-400 text-sm block mb-1">Address</label>
                <input value={form.address} onChange={e => updateField('address', e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50" placeholder="Street address" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-slate-400 text-sm block mb-1">City</label>
                  <input value={form.city} onChange={e => updateField('city', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
                </div>
                <div>
                  <label className="text-slate-400 text-sm block mb-1">State</label>
                  <input value={form.state} onChange={e => updateField('state', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
                </div>
                <div>
                  <label className="text-slate-400 text-sm block mb-1">ZIP</label>
                  <input value={form.zip} onChange={e => updateField('zip', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
                </div>
              </div>
              <div>
                <label className="text-slate-400 text-sm block mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => updateField('notes', e.target.value)} rows={2}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2.5 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-colors">Cancel</button>
              <button onClick={handleSave}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-violet-600 text-white font-semibold rounded-xl hover:from-violet-600 hover:to-violet-700 transition-all flex items-center justify-center gap-2">
                <Save size={16} /> {editId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <Users size={48} className="mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400">No customers found</p>
          </div>
        ) : (
          filtered.map(c => (
            <div key={c.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:bg-slate-800 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                  {c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"><Edit size={14} /></button>
                  <button onClick={() => deleteCustomer(c.id)} className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
              <h4 className="text-white font-semibold mb-2">{c.name}</h4>
              <div className="space-y-1.5">
                {c.email && <p className="text-slate-400 text-sm flex items-center gap-2"><Mail size={12} /> {c.email}</p>}
                {c.phone && <p className="text-slate-400 text-sm flex items-center gap-2"><Phone size={12} /> {c.phone}</p>}
                {c.city && <p className="text-slate-400 text-sm flex items-center gap-2"><MapPin size={12} /> {c.city}, {c.state} {c.zip}</p>}
              </div>
              {c.notes && <p className="text-slate-500 text-xs mt-3 italic">{c.notes}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CustomerList;
