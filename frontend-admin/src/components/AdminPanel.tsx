import { useState, useEffect, useCallback } from 'react'
import type { Estimate, AdminStats, CreateEstimatePayload, UpdateEstimatePayload } from '../types'
import { api } from '../api'
import { StatsBar } from './StatsBar'
import { EstimateModal } from './EstimateModal'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:    { bg: '#1e293b', text: '#64748b' },
  sent:     { bg: '#1e3a5f', text: '#60a5fa' },
  accepted: { bg: '#431407', text: '#f97316' },
  paid:     { bg: '#14532d', text: '#22c55e' },
}

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

interface NewEstimateForm {
  type: 'estimate' | 'invoice'
  customer_name: string
  customer_email: string
  business_name: string
  tax_rate: string
}

export function AdminPanel() {
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [selected, setSelected] = useState<Estimate | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState<NewEstimateForm>({
    type: 'estimate',
    customer_name: '',
    customer_email: '',
    business_name: '',
    tax_rate: '0',
  })

  const loadData = useCallback(async () => {
    try {
      const [ests, st] = await Promise.all([api.listEstimates(), api.getStats()])
      setEstimates(ests)
      setStats(st)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setLoading(false)
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const payload: CreateEstimatePayload = {
        type: createForm.type,
        customer_name: createForm.customer_name,
        customer_email: createForm.customer_email,
        business_name: createForm.business_name,
        tax_rate: Number(createForm.tax_rate),
      }
      const created = await api.createEstimate(payload)
      setEstimates(prev => [created, ...prev])
      setShowCreate(false)
      setSelected(created)
      await loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create')
    } finally {
      setCreating(false)
    }
  }

  const handleSave = async (id: string, payload: UpdateEstimatePayload) => {
    const updated = await api.updateEstimate(id, payload)
    setEstimates(prev => prev.map(e => e.id === id ? updated : e))
    setSelected(updated)
    await loadData()
  }

  const handleDelete = async (id: string) => {
    await api.deleteEstimate(id)
    setEstimates(prev => prev.filter(e => e.id !== id))
    setSelected(null)
    await loadData()
  }

  const filtered = estimates.filter(e => {
    const matchSearch = !search ||
      e.number.toLowerCase().includes(search.toLowerCase()) ||
      e.customer.name.toLowerCase().includes(search.toLowerCase()) ||
      e.customer.email.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || e.status === filterStatus
    const matchType = filterType === 'all' || e.type === filterType
    return matchSearch && matchStatus && matchType
  })

  return (
    <div>
      <StatsBar stats={stats} loading={statsLoading} />

      {error && (
        <div style={{
          background: '#450a0a', border: '1px solid #ef4444', borderRadius: '10px',
          padding: '14px 18px', color: '#fca5a5', marginBottom: '20px', fontSize: '14px',
        }}>
          {error} — <button onClick={() => { setError(''); loadData() }} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', textDecoration: 'underline' }}>Retry</button>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by number, customer name or email..."
          style={{
            flex: 1, minWidth: '200px',
            background: '#1e293b', border: '1px solid #334155', borderRadius: '8px',
            color: '#fff', padding: '10px 14px', fontSize: '14px', outline: 'none',
          }}
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={selectStyle}
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="paid">Paid</option>
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          style={selectStyle}
        >
          <option value="all">All Types</option>
          <option value="estimate">Estimates</option>
          <option value="invoice">Invoices</option>
        </select>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: '10px 20px', background: '#f97316', border: 'none',
            borderRadius: '8px', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          + New Estimate / Invoice
        </button>
      </div>

      {/* Table */}
      <div style={{
        background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '120px 90px 1fr 1fr 100px 120px 80px',
          padding: '12px 20px',
          borderBottom: '1px solid #334155',
          color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          <span>Number</span>
          <span>Type</span>
          <span>Customer</span>
          <span>Business</span>
          <span>Total</span>
          <span>Status</span>
          <span>Date</span>
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#475569' }}>Loading estimates...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#475569' }}>
            {estimates.length === 0 ? 'No estimates yet. Create your first one above.' : 'No results match your filters.'}
          </div>
        ) : (
          filtered.map((est, i) => (
            <div
              key={est.id}
              onClick={() => setSelected(est)}
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 90px 1fr 1fr 100px 120px 80px',
                padding: '14px 20px',
                borderBottom: i < filtered.length - 1 ? '1px solid #1e293b' : 'none',
                cursor: 'pointer',
                transition: 'background 0.15s',
                alignItems: 'center',
                background: i % 2 === 0 ? '#0f172a' : '#1e293b',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1e3a5f')}
              onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? '#0f172a' : '#1e293b')}
            >
              <span style={{ color: '#f97316', fontWeight: 700, fontSize: '14px' }}>{est.number}</span>
              <span style={{
                fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                color: est.type === 'invoice' ? '#a78bfa' : '#60a5fa',
              }}>{est.type}</span>
              <div>
                <div style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>{est.customer.name || '—'}</div>
                <div style={{ color: '#64748b', fontSize: '12px' }}>{est.customer.email || ''}</div>
              </div>
              <span style={{ color: '#94a3b8', fontSize: '13px' }}>{est.business_name || '—'}</span>
              <span style={{ color: '#34d399', fontWeight: 700, fontSize: '14px' }}>{fmtCurrency(est.total)}</span>
              <span style={{
                display: 'inline-block',
                padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.05em',
                background: STATUS_COLORS[est.status]?.bg || '#1e293b',
                color: STATUS_COLORS[est.status]?.text || '#fff',
              }}>{est.status}</span>
              <span style={{ color: '#475569', fontSize: '12px' }}>
                {new Date(est.created_at).toLocaleDateString()}
              </span>
            </div>
          ))
        )}
      </div>

      <div style={{ color: '#475569', fontSize: '12px', marginTop: '12px', textAlign: 'right' }}>
        {filtered.length} of {estimates.length} records
      </div>

      {/* Edit Modal */}
      {selected && (
        <EstimateModal
          estimate={selected}
          onClose={() => setSelected(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}

      {/* Create Modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }} onClick={e => { if (e.target === e.currentTarget) setShowCreate(false) }}>
          <div style={{
            background: '#1e293b', borderRadius: '16px', border: '1px solid #334155',
            width: '100%', maxWidth: '480px', padding: '28px',
          }}>
            <h3 style={{ color: '#fff', margin: '0 0 24px', fontSize: '20px', fontWeight: 700 }}>New Document</h3>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              {(['estimate', 'invoice'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setCreateForm(f => ({ ...f, type: t }))}
                  style={{
                    flex: 1, padding: '12px',
                    background: createForm.type === t ? '#f97316' : '#334155',
                    border: 'none', borderRadius: '10px',
                    color: '#fff', fontWeight: 700, fontSize: '15px', cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            {[
              ['customer_name', 'Customer Name', 'text'],
              ['customer_email', 'Customer Email', 'email'],
              ['business_name', 'Your Business Name', 'text'],
              ['tax_rate', 'Tax Rate (%)', 'number'],
            ].map(([field, label, type]) => (
              <div key={field} style={{ marginBottom: '14px' }}>
                <label style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                <input
                  type={type}
                  value={(createForm as unknown as Record<string, string>)[field]}
                  onChange={e => setCreateForm(f => ({ ...f, [field]: e.target.value }))}
                  style={{
                    width: '100%', background: '#0f172a', border: '1px solid #334155',
                    borderRadius: '8px', color: '#fff', padding: '10px 12px',
                    fontSize: '14px', marginTop: '6px', boxSizing: 'border-box', outline: 'none',
                  }}
                  placeholder={label}
                />
              </div>
            ))}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setShowCreate(false)} style={{
                flex: 1, padding: '12px', background: '#334155', border: 'none',
                borderRadius: '10px', color: '#cbd5e1', fontWeight: 600, cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={handleCreate} disabled={creating} style={{
                flex: 1, padding: '12px', background: '#f97316', border: 'none',
                borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer',
              }}>
                {creating ? 'Creating...' : `Create ${createForm.type}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  background: '#1e293b', border: '1px solid #334155', borderRadius: '8px',
  color: '#fff', padding: '10px 12px', fontSize: '14px', outline: 'none', cursor: 'pointer',
}
