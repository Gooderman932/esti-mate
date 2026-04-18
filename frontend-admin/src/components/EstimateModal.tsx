import { useState } from 'react'
import type { Estimate, LineItem, UpdateEstimatePayload } from '../types'

interface Props {
  estimate: Estimate
  onClose: () => void
  onSave: (id: string, payload: UpdateEstimatePayload) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const STATUS_OPTIONS = ['draft', 'sent', 'accepted', 'paid'] as const
const STATUS_COLORS: Record<string, string> = {
  draft: '#64748b', sent: '#3b82f6', accepted: '#f97316', paid: '#22c55e',
}

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export function EstimateModal({ estimate, onClose, onSave, onDelete }: Props) {
  const [status, setStatus] = useState(estimate.status)
  const [notes, setNotes] = useState(estimate.notes)
  const [taxRate, setTaxRate] = useState(estimate.tax_rate)
  const [lineItems, setLineItems] = useState<LineItem[]>(estimate.line_items)
  const [customer, setCustomer] = useState(estimate.customer)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [activeSection, setActiveSection] = useState<'details' | 'items' | 'customer'>('details')

  const subtotal = lineItems.reduce((sum, i) => sum + i.amount, 0)
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount

  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [field]: value }
      if (field === 'quantity' || field === 'unit_price') {
        updated.amount = Number(updated.quantity) * Number(updated.unit_price)
      }
      return updated
    }))
  }

  const addItem = () => {
    const newItem: LineItem = {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      unit_price: 0,
      unit: 'each',
      amount: 0,
    }
    setLineItems(prev => [...prev, newItem])
  }

  const removeItem = (id: string) => {
    setLineItems(prev => prev.filter(i => i.id !== id))
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave(estimate.id, {
      status,
      notes,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      subtotal,
      total,
      line_items: lineItems,
      customer,
    })
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    await onDelete(estimate.id)
  }

  const sectionBtn = (s: typeof activeSection, label: string) => (
    <button
      onClick={() => setActiveSection(s)}
      style={{
        padding: '8px 16px',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '13px',
        background: activeSection === s ? '#f97316' : '#334155',
        color: activeSection === s ? '#fff' : '#94a3b8',
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '20px',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: '#1e293b', borderRadius: '16px', border: '1px solid #334155',
        width: '100%', maxWidth: '780px', maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #334155',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#fff', fontSize: '20px', fontWeight: 700 }}>{estimate.number}</span>
              <span style={{
                padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.05em',
                background: estimate.type === 'invoice' ? '#7c3aed20' : '#1e3a5f',
                color: estimate.type === 'invoice' ? '#a78bfa' : '#60a5fa',
              }}>
                {estimate.type}
              </span>
              <span style={{ color: '#64748b', fontSize: '13px' }}>
                {new Date(estimate.created_at).toLocaleDateString()}
              </span>
            </div>
            <div style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
              {estimate.customer.name || 'No customer'} • Share code: <strong style={{ color: '#f97316' }}>{estimate.share_code}</strong>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '24px', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Status + Section Tabs */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid #334155',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {sectionBtn('details', 'Details')}
            {sectionBtn('items', `Line Items (${lineItems.length})`)}
            {sectionBtn('customer', 'Customer')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: '#64748b', fontSize: '13px' }}>Status:</span>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as typeof status)}
              style={{
                background: '#0f172a', border: '1px solid #475569', borderRadius: '8px',
                color: STATUS_COLORS[status], padding: '6px 12px', fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em',
              }}
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s} style={{ color: STATUS_COLORS[s] }}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {activeSection === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tax Rate (%)</label>
                <input
                  type="number"
                  value={taxRate}
                  onChange={e => setTaxRate(Number(e.target.value))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  placeholder="Payment terms, special instructions..."
                />
              </div>
              {/* Totals */}
              <div style={{ background: '#0f172a', borderRadius: '12px', padding: '20px' }}>
                <Row label="Subtotal" value={fmtCurrency(subtotal)} />
                <Row label={`Tax (${taxRate}%)`} value={fmtCurrency(taxAmount)} />
                <div style={{ borderTop: '1px solid #334155', marginTop: '12px', paddingTop: '12px' }}>
                  <Row label="Total" value={fmtCurrency(total)} bold />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'items' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <button onClick={addItem} style={orangeBtn}>+ Add Line Item</button>
              </div>
              {lineItems.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#475569', padding: '40px' }}>No line items yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {lineItems.map(item => (
                    <div key={item.id} style={{
                      background: '#0f172a', borderRadius: '10px', padding: '16px',
                      border: '1px solid #334155',
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                        <input
                          value={item.description}
                          onChange={e => updateItem(item.id, 'description', e.target.value)}
                          placeholder="Description"
                          style={inputStyle}
                        />
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                          placeholder="Qty"
                          style={{ ...inputStyle, width: '80px' }}
                        />
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={e => updateItem(item.id, 'unit_price', Number(e.target.value))}
                          placeholder="Unit $"
                          style={{ ...inputStyle, width: '100px' }}
                        />
                        <button onClick={() => removeItem(item.id)} style={deleteBtn}>×</button>
                      </div>
                      <div style={{ color: '#f97316', fontWeight: 700, textAlign: 'right', fontSize: '15px' }}>
                        {fmtCurrency(item.amount)}
                      </div>
                    </div>
                  ))}
                  <div style={{ textAlign: 'right', padding: '12px', color: '#fff', fontWeight: 800, fontSize: '18px' }}>
                    Total: {fmtCurrency(total)}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'customer' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {([
                ['name', 'Customer Name'],
                ['email', 'Email'],
                ['phone', 'Phone'],
                ['address', 'Address'],
              ] as const).map(([field, label]) => (
                <div key={field} style={field === 'address' ? { gridColumn: '1 / -1' } : {}}>
                  <label style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                  <input
                    value={(customer as unknown as Record<string, string>)[field] ?? ''}
                    onChange={e => setCustomer(prev => ({ ...prev, [field]: e.target.value }))}
                    style={inputStyle}
                    placeholder={label}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #334155',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <button
            onClick={handleDelete}
            style={{
              padding: '10px 20px', borderRadius: '8px', border: '1px solid #ef4444',
              background: confirmDelete ? '#ef4444' : 'transparent',
              color: confirmDelete ? '#fff' : '#ef4444',
              cursor: 'pointer', fontWeight: 600, fontSize: '14px',
            }}
          >
            {confirmDelete ? 'Confirm Delete' : 'Delete'}
          </button>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={onClose} style={grayBtn}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={orangeBtn}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
      <span style={{ color: '#94a3b8', fontSize: '14px' }}>{label}</span>
      <span style={{ color: bold ? '#fff' : '#cbd5e1', fontWeight: bold ? 800 : 400, fontSize: bold ? '18px' : '14px' }}>{value}</span>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#fff',
  padding: '10px 12px',
  fontSize: '14px',
  marginTop: '6px',
  boxSizing: 'border-box',
  outline: 'none',
}

const orangeBtn: React.CSSProperties = {
  padding: '10px 20px',
  background: '#f97316',
  border: 'none',
  borderRadius: '8px',
  color: '#fff',
  fontWeight: 700,
  fontSize: '14px',
  cursor: 'pointer',
}

const grayBtn: React.CSSProperties = {
  padding: '10px 20px',
  background: '#334155',
  border: 'none',
  borderRadius: '8px',
  color: '#cbd5e1',
  fontWeight: 600,
  fontSize: '14px',
  cursor: 'pointer',
}

const deleteBtn: React.CSSProperties = {
  width: '32px',
  height: '32px',
  background: '#ef444420',
  border: '1px solid #ef4444',
  borderRadius: '6px',
  color: '#ef4444',
  cursor: 'pointer',
  fontSize: '18px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}
