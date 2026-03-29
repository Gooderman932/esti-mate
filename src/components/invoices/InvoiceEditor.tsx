import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Invoice, LineItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { exportInvoicePDF } from '@/lib/pdfExport';
import { ArrowLeft, Plus, Trash2, Camera, Save, Ruler, GripVertical, FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const emptyLineItem = (): LineItem => ({
  id: uuidv4(), description: '', type: 'material', quantity: 1,
  unitPrice: 0, unit: 'ea', notes: '', total: 0,
});

const InvoiceEditor: React.FC = () => {
  const {
    editingId, setEditingId, setCurrentView, invoices, customers,
    addInvoice, updateInvoice, setAutoMeasureTarget, settings
  } = useAppContext();

  const existing = editingId ? invoices.find(i => i.id === editingId) : null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [status, setStatus] = useState<Invoice['status']>('draft');
  const [taxRate, setTaxRate] = useState(8.5);
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLineItem()]);
  const [dueDate, setDueDate] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setDescription(existing.description);
      setCustomerId(existing.customerId);
      setStatus(existing.status);
      setTaxRate(existing.taxRate);
      setNotes(existing.notes);
      setLineItems(existing.lineItems.length > 0 ? [...existing.lineItems] : [emptyLineItem()]);
      setDueDate(existing.dueDate ? existing.dueDate.split('T')[0] : '');
    }
  }, [existing]);

  const customerObj = customers.find(c => c.id === customerId) || null;
  const customerName = customerObj?.name || '';

  const updateLineItem = (id: string, field: string, value: any) => {
    setLineItems(prev => prev.map(li => {
      if (li.id !== id) return li;
      const updated = { ...li, [field]: value };
      updated.total = updated.quantity * updated.unitPrice;
      return updated;
    }));
  };

  const addLineItemFn = () => setLineItems(prev => [...prev, emptyLineItem()]);
  const removeLineItem = (id: string) => setLineItems(prev => prev.filter(li => li.id !== id));

  const subtotal = lineItems.reduce((s, li) => s + (li.quantity * li.unitPrice), 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const handleSave = () => {
    if (!title.trim()) return;
    const data = {
      customerId, customerName, title, description, status, lineItems, taxRate, notes,
      dueDate: dueDate ? new Date(dueDate).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString(),
    };
    if (existing) {
      updateInvoice(existing.id, data);
    } else {
      addInvoice(data);
    }
    setCurrentView('invoices');
    setEditingId(null);
  };

  const handleExportPDF = async () => {
    if (!existing) {
      toast.error('Please save the invoice before exporting.');
      return;
    }
    setExporting(true);
    try {
      const inv = invoices.find(i => i.id === existing.id);
      if (!inv) return;
      const cust = customers.find(c => c.id === inv.customerId) || null;
      exportInvoicePDF(inv, cust);
      toast.success('PDF exported successfully');
    } catch (err) {
      toast.error('Failed to export PDF');
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const handleAutoMeasure = (lineItemId: string, field: string) => {
    if (existing) {
      setAutoMeasureTarget({ invoiceId: existing.id, lineItemId, field });
    } else {
      setAutoMeasureTarget({ lineItemId, field });
    }
    setCurrentView('measure');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => { setCurrentView('invoices'); setEditingId(null); }}
          className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-white">{existing ? `Edit ${existing.number}` : 'New Invoice'}</h2>
          <p className="text-slate-400 text-sm">{existing ? existing.title : 'Create a new invoice'}</p>
        </div>
        <div className="flex-1" />
        {existing && (
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="px-4 py-2.5 bg-slate-700/80 text-white font-medium rounded-xl hover:bg-slate-600 transition-all border border-slate-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
            Export PDF
          </button>
        )}
        <button onClick={handleSave}
          className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2">
          <Save size={18} /> Save
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 space-y-4">
          <h3 className="text-white font-semibold">Invoice Details</h3>
          <div>
            <label className="text-slate-400 text-sm block mb-1">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="Invoice title" />
          </div>
          <div>
            <label className="text-slate-400 text-sm block mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none" />
          </div>
          <div>
            <label className="text-slate-400 text-sm block mb-1">Customer</label>
            <select value={customerId} onChange={e => setCustomerId(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
              <option value="">Select customer...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 space-y-4">
          <h3 className="text-white font-semibold">Status & Terms</h3>
          <div>
            <label className="text-slate-400 text-sm block mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as Invoice['status'])}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="text-slate-400 text-sm block mb-1">Tax Rate (%)</label>
            <input type="number" value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} step="0.1"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
          </div>
          <div>
            <label className="text-slate-400 text-sm block mb-1">Due Date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
          </div>
          <div>
            <label className="text-slate-400 text-sm block mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none" />
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Line Items</h3>
          <button onClick={addLineItemFn}
            className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition-colors flex items-center gap-1">
            <Plus size={14} /> Add Item
          </button>
        </div>
        <div className="space-y-4">
          {lineItems.map((li, idx) => (
            <div key={li.id} className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
              <div className="flex items-center gap-2 mb-3">
                <GripVertical size={16} className="text-slate-600" />
                <span className="text-slate-500 text-xs font-medium">#{idx + 1}</span>
                <div className="flex-1" />
                <button onClick={() => removeLineItem(li.id)} className="p-1 text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="col-span-2">
                  <label className="text-slate-500 text-xs block mb-1">Description</label>
                  <input value={li.description} onChange={e => updateLineItem(li.id, 'description', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
                <div>
                  <label className="text-slate-500 text-xs block mb-1">Type</label>
                  <select value={li.type} onChange={e => updateLineItem(li.id, 'type', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                    <option value="labor">Labor</option>
                    <option value="material">Material</option>
                    <option value="equipment">Equipment</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-500 text-xs block mb-1">Unit</label>
                  <input value={li.unit} onChange={e => updateLineItem(li.id, 'unit', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
                <div>
                  <label className="text-slate-500 text-xs block mb-1">Quantity</label>
                  <input type="number" value={li.quantity} onChange={e => updateLineItem(li.id, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
                <div>
                  <label className="text-slate-500 text-xs block mb-1">Unit Price ($)</label>
                  <input type="number" value={li.unitPrice} onChange={e => updateLineItem(li.id, 'unitPrice', parseFloat(e.target.value) || 0)} step="0.01"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
                <div>
                  <label className="text-slate-500 text-xs block mb-1 flex items-center gap-1">
                    Length
                    <button onClick={() => handleAutoMeasure(li.id, 'length')} className="text-orange-400 hover:text-orange-300"><Camera size={12} /></button>
                  </label>
                  <div className="flex gap-1">
                    <input type="number" value={li.length || ''} onChange={e => updateLineItem(li.id, 'length', parseFloat(e.target.value) || undefined)} step="0.01"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="—" />
                    <button onClick={() => handleAutoMeasure(li.id, 'length')}
                      className="px-2 py-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors flex-shrink-0"><Ruler size={14} /></button>
                  </div>
                </div>
                <div>
                  <label className="text-slate-500 text-xs block mb-1 flex items-center gap-1">
                    Height
                    <button onClick={() => handleAutoMeasure(li.id, 'height')} className="text-orange-400 hover:text-orange-300"><Camera size={12} /></button>
                  </label>
                  <div className="flex gap-1">
                    <input type="number" value={li.height || ''} onChange={e => updateLineItem(li.id, 'height', parseFloat(e.target.value) || undefined)} step="0.01"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="—" />
                    <button onClick={() => handleAutoMeasure(li.id, 'height')}
                      className="px-2 py-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors flex-shrink-0"><Ruler size={14} /></button>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/30">
                <input value={li.notes} onChange={e => updateLineItem(li.id, 'notes', e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-transparent text-slate-400 text-sm focus:outline-none" placeholder="Notes..." />
                <span className="text-white font-semibold text-sm ml-4">${(li.quantity * li.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 pt-4 border-t border-slate-700/50">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-slate-400 text-sm"><span>Subtotal</span><span className="text-white">${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between text-slate-400 text-sm"><span>Tax ({taxRate}%)</span><span className="text-white">${taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-slate-700/50"><span>Total</span><span>${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceEditor;
