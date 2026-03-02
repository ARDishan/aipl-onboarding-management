import { useState } from 'react'
import { useApp, ROLES, NAV_LABELS } from '../../context/AppContext'
import { fmtDateTime } from '../shared/index.jsx'

export function Layout({ children }) {
  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: '#f8fafc' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar />
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {children}
        </main>
      </div>
      <Toast />
    </div>
  )
}

function Sidebar() {
  const { activeRole, activePage, setActivePage, switchRole } = useApp()
  const role = ROLES[activeRole]

  return (
    <aside style={{ width: 260, background: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 16px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          AI
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b', lineHeight: 1.2 }}>Analytical</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Instruments (Pvt) Ltd</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        {role.nav.map(page => {
          const active = activePage === page
          return (
            <button key={page} onClick={() => setActivePage(page)} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '9px 12px', border: 'none', borderRadius: 8, cursor: 'pointer',
              fontSize: 13.5, fontWeight: active ? 700 : 500, textAlign: 'left',
              marginBottom: 2, transition: 'all 0.15s',
              background: active ? role.bg : 'transparent',
              color: active ? role.color : '#64748b',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? role.color : '#cbd5e1', flexShrink: 0 }} />
              {NAV_LABELS[page]}
            </button>
          )
        })}
      </nav>

      {/* Role Switcher */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid #f1f5f9' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 8 }}>
          DEMO — SWITCH ROLE
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {Object.entries(ROLES).map(([key, r]) => (
            <button key={key} onClick={() => switchRole(key)} title={r.label} style={{
              width: 34, height: 34, borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 16, transition: 'all 0.15s',
              background: activeRole === key ? r.color : '#f1f5f9',
              color: activeRole === key ? '#fff' : '#64748b',
            }}>
              {r.icon}
            </button>
          ))}
        </div>
        <div style={{ padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, textAlign: 'center', background: role.bg, color: role.color }}>
          {role.icon} {role.label}
        </div>
      </div>
    </aside>
  )
}

function TopBar() {
  const { activePage, notifications, markNotifRead, activeRole } = useApp()
  const role = ROLES[activeRole]
  const [showNotif, setShowNotif] = useState(false)
  const unread = notifications.filter(n => !n.is_read).length

  return (
    <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1e293b' }}>{NAV_LABELS[activePage]}</h1>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>Onboarding Management Module</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowNotif(p => !p)} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', padding: '4px 8px', position: 'relative' }}>
            🔔
            {unread > 0 && (
              <span style={{ position: 'absolute', top: 0, right: 0, background: '#ef4444', color: '#fff', borderRadius: '50%', fontSize: 10, fontWeight: 700, width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {unread}
              </span>
            )}
          </button>
          {showNotif && (
            <div style={{ position: 'absolute', right: 0, top: 44, width: 320, background: '#fff', borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.12)', border: '1px solid #e2e8f0', zIndex: 1000, maxHeight: 380, overflowY: 'auto' }}>
              <div style={{ padding: '12px 16px', fontWeight: 700, fontSize: 14, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
                Notifications
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400 }}>{unread} unread</span>
              </div>
              {notifications.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No notifications</div>
              )}
              {notifications.map(n => (
                <div key={n.id} onClick={() => markNotifRead(n.id)} style={{
                  padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f8fafc',
                  background: n.is_read ? '#fff' : '#f0f9ff',
                }}>
                  <div style={{ fontSize: 13, color: '#1e293b', fontWeight: n.is_read ? 400 : 600 }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{n.message}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{fmtDateTime(n.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Role chip */}
        <div style={{ padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, background: role.bg, color: role.color }}>
          {role.icon} {role.label}
        </div>
      </div>
    </header>
  )
}

function Toast() {
  const { toast } = useApp()
  if (!toast) return null
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: toast.type === 'success' ? '#10b981' : '#ef4444',
      color: '#fff', padding: '14px 20px', borderRadius: 10,
      fontWeight: 600, fontSize: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      {toast.type === 'success' ? '✅' : '❌'} {toast.message}
    </div>
  )
}