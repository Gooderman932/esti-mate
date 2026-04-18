import { useState } from 'react'
import { AdminPanel } from './components/AdminPanel'
import { CustomerPanel } from './components/CustomerPanel'

type Tab = 'admin' | 'customer'

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('admin')

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#fff',
    }}>
      {/* Header */}
      <header style={{
        background: '#1e293b',
        borderBottom: '1px solid #334155',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🏗️</span>
            <span style={{ fontWeight: 800, fontSize: '20px', color: '#fff' }}>Esti-Mate</span>
            <span style={{
              padding: '2px 8px', background: '#f9731620', borderRadius: '5px',
              color: '#f97316', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em',
            }}>PRO</span>
          </div>

          {/* Tab Navigation */}
          <nav style={{ display: 'flex', gap: '4px', background: '#0f172a', borderRadius: '10px', padding: '4px' }}>
            {([
              { id: 'admin' as Tab, label: 'Admin Panel', icon: '⚙️' },
              { id: 'customer' as Tab, label: 'Customer Portal', icon: '👤' },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '7px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s',
                  background: activeTab === tab.id ? '#1e293b' : 'transparent',
                  color: activeTab === tab.id ? '#f97316' : '#64748b',
                  boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                }}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div style={{ color: '#475569', fontSize: '13px' }}>
          Construction Estimating Dashboard
        </div>
      </header>

      {/* Main content */}
      <main style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        {activeTab === 'admin' ? <AdminPanel /> : <CustomerPanel />}
      </main>
    </div>
  )
}
