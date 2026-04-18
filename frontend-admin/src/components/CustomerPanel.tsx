import { useState } from 'react'
import type { Estimate } from '../types'
import { api } from '../api'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:    { bg: '#1e293b', text: '#64748b' },
  sent:     { bg: '#1e3a5f', text: '#60a5fa' },
  accepted: { bg: '#431407', text: '#f97316' },
  paid:     { bg: '#14532d', text: '#22c55e' },
}

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export function CustomerPanel() {
  const [code, setCode] = useState('')
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLookup = async () => {
    if (!code.trim()) return
    setLoading(true)
    setError('')
    setEstimate(null)
    try {
      const est = await api.getEstimateByShareCode(code.trim().toUpperCase())
      setEstimate(est)
    } catch {
      setError('No estimate found for that code. Please check and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLookup()
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      {/* Search section */}
      <div style={{
        background: '#1e293b', borderRadius: '16px', border: '1px solid #334155',
        padding: '32px', marginBottom: '32px', textAlign: 'center',
      }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>📄</div>
        <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: 800, margin: '0 0 8px' }}>
          View Your Estimate
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '15px', margin: '0 0 28px' }}>
          Enter the share code from your estimate or invoice to view the full details.
        </p>
        <div style={{ display: 'flex', gap: '12px', maxWidth: '420px', margin: '0 auto' }}>
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder="e.g. A1B2C3D4"
            maxLength={8}
            style={{
              flex: 1,
              background: '#0f172a', border: '2px solid #334155', borderRadius: '10px',
              color: '#fff', padding: '12px 16px', fontSize: '18px', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', outline: 'none',
              textAlign: 'center',
            }}
          />
          <button
            onClick={handleLookup}
            disabled={loading || !code.trim()}
            style={{
              padding: '12px 24px', background: '#f97316', border: 'none',
              borderRadius: '10px', color: '#fff', fontWeight: 700, fontSize: '15px',
              cursor: 'pointer', whiteSpace: 'nowrap',
              opacity: loading || !code.trim() ? 0.6 : 1,
            }}
          >
            {loading ? 'Looking up...' : 'Look Up'}
          </button>
        </div>
        {error && (
          <p style={{ color: '#f87171', marginTop: '16px', fontSize: '14px' }}>{error}</p>
        )}
      </div>

      {/* Estimate view */}
      {estimate && (
        <div style={{
          background: '#1e293b', borderRadius: '16px', border: '1px solid #334155',
          overflow: 'hidden',
        }}>
          {/* Document header */}
          <div style={{
            background: '#0f172a', padding: '28px 32px',
            borderBottom: '1px solid #334155',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                {estimate.business_name && (
                  <div style={{ color: '#f97316', fontWeight: 800, fontSize: '20px', marginBottom: '4px' }}>
                    {estimate.business_name}
                  </div>
                )}
                <div style={{ color: '#64748b', fontSize: '14px' }}>
                  {new Date(estimate.created_at).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  color: '#fff', fontSize: '24px', fontWeight: 800, marginBottom: '6px',
                }}>{estimate.number}</div>
                <span style={{
                  display: 'inline-block', padding: '5px 14px', borderRadius: '8px',
                  fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                  background: STATUS_COLORS[estimate.status]?.bg,
                  color: STATUS_COLORS[estimate.status]?.text,
                }}>
                  {estimate.status}
                </span>
              </div>
            </div>
          </div>

          {/* Customer info */}
          {(estimate.customer.name || estimate.customer.email) && (
            <div style={{ padding: '20px 32px', borderBottom: '1px solid #334155' }}>
              <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Bill To</div>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '16px' }}>{estimate.customer.name}</div>
              {estimate.customer.email && <div style={{ color: '#94a3b8', fontSize: '14px' }}>{estimate.customer.email}</div>}
              {estimate.customer.phone && <div style={{ color: '#94a3b8', fontSize: '14px' }}>{estimate.customer.phone}</div>}
              {estimate.customer.address && <div style={{ color: '#94a3b8', fontSize: '14px' }}>{estimate.customer.address}</div>}
            </div>
          )}

          {/* Line items */}
          <div style={{ padding: '20px 32px', borderBottom: '1px solid #334155' }}>
            <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>Line Items</div>
            {estimate.line_items.length === 0 ? (
              <div style={{ color: '#475569', fontStyle: 'italic' }}>No line items.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    {['Description', 'Qty', 'Unit Price', 'Amount'].map(h => (
                      <th key={h} style={{
                        textAlign: h === 'Description' ? 'left' : 'right',
                        padding: '8px 0', color: '#64748b', fontSize: '12px',
                        fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {estimate.line_items.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '12px 0', color: '#fff', fontSize: '14px' }}>
                        {item.description}
                        {item.measurement && (
                          <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '8px' }}>({item.measurement})</span>
                        )}
                        {item.notes && (
                          <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>{item.notes}</div>
                        )}
                      </td>
                      <td style={{ padding: '12px 0', color: '#94a3b8', textAlign: 'right', fontSize: '14px' }}>
                        {item.quantity} {item.unit}
                      </td>
                      <td style={{ padding: '12px 0', color: '#94a3b8', textAlign: 'right', fontSize: '14px' }}>
                        {fmtCurrency(item.unit_price)}
                      </td>
                      <td style={{ padding: '12px 0', color: '#f97316', fontWeight: 700, textAlign: 'right', fontSize: '14px' }}>
                        {fmtCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Totals */}
          <div style={{ padding: '20px 32px', borderBottom: estimate.notes ? '1px solid #334155' : 'none' }}>
            <div style={{ maxWidth: '280px', marginLeft: 'auto' }}>
              <TotalRow label="Subtotal" value={fmtCurrency(estimate.subtotal)} />
              <TotalRow label={`Tax (${estimate.tax_rate}%)`} value={fmtCurrency(estimate.tax_amount)} />
              <div style={{ borderTop: '2px solid #334155', marginTop: '12px', paddingTop: '12px' }}>
                <TotalRow label="Total" value={fmtCurrency(estimate.total)} bold />
              </div>
            </div>
          </div>

          {/* Notes */}
          {estimate.notes && (
            <div style={{ padding: '20px 32px' }}>
              <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Notes</div>
              <div style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{estimate.notes}</div>
            </div>
          )}

          {/* Footer */}
          <div style={{
            background: '#0f172a', padding: '16px 32px',
            borderTop: '1px solid #334155',
            color: '#475569', fontSize: '12px', textAlign: 'center',
          }}>
            Share code: <strong style={{ color: '#f97316' }}>{estimate.share_code}</strong> · Generated by Esti-Mate Pro
          </div>
        </div>
      )}
    </div>
  )
}

function TotalRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
      <span style={{ color: '#94a3b8', fontSize: bold ? '16px' : '14px', fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ color: bold ? '#fff' : '#cbd5e1', fontSize: bold ? '22px' : '14px', fontWeight: bold ? 800 : 400 }}>{value}</span>
    </div>
  )
}
