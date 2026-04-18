import type { AdminStats } from '../types'

interface Props {
  stats: AdminStats | null
  loading: boolean
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

export function StatsBar({ stats, loading }: Props) {
  const cards = [
    { label: 'Total Estimates', value: loading ? '—' : String(stats?.total_estimates ?? 0), color: '#60a5fa' },
    { label: 'Total Invoices', value: loading ? '—' : String(stats?.total_invoices ?? 0), color: '#a78bfa' },
    { label: 'Total Revenue', value: loading ? '—' : fmt(stats?.total_revenue ?? 0), color: '#34d399' },
    { label: 'Active Subscriptions', value: loading ? '—' : String(stats?.active_subscriptions ?? 0), color: '#f97316' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
      {cards.map(c => (
        <div key={c.label} style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '12px',
          padding: '20px 24px',
        }}>
          <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            {c.label}
          </div>
          <div style={{ color: c.color, fontSize: '28px', fontWeight: 800 }}>
            {c.value}
          </div>
        </div>
      ))}
    </div>
  )
}
