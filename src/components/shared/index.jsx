// ─── Status Badge ────────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    // Onboarding cases
    initiated:        { bg: '#fef3c7', color: '#d97706' },
    in_progress:      { bg: '#dbeafe', color: '#2563eb' },
    pending_employee: { bg: '#e0f2fe', color: '#0369a1' },
    completed:        { bg: '#dcfce7', color: '#16a34a' },
    on_hold:          { bg: '#f1f5f9', color: '#475569' },
    // Employee status
    on_probation:     { bg: '#fef3c7', color: '#d97706' },
    confirmed:        { bg: '#dcfce7', color: '#16a34a' },
    extended:         { bg: '#fce7f3', color: '#db2777' },
    terminated:       { bg: '#fee2e2', color: '#dc2626' },
    // SLA
    active:           { bg: '#dbeafe', color: '#2563eb' },
    breached:         { bg: '#fee2e2', color: '#dc2626' },
    // CAPEX / UCR
    pending:          { bg: '#fef3c7', color: '#d97706' },
    sent:             { bg: '#dbeafe', color: '#2563eb' },
    approved:         { bg: '#dcfce7', color: '#16a34a' },
    rejected:         { bg: '#fee2e2', color: '#dc2626' },
    // Account creation statuses (no duplicate — in_progress already defined above)
    failed:           { bg: '#fee2e2', color: '#dc2626' },
    // Documents
    viewed:           { bg: '#dbeafe', color: '#2563eb' },
    signed:           { bg: '#dcfce7', color: '#16a34a' },
    uploaded:         { bg: '#f0fdf4', color: '#16a34a' },
    // Milestones
    upcoming:         { bg: '#f1f5f9', color: '#64748b' },
    overdue:          { bg: '#fee2e2', color: '#dc2626' },
    // Sync
    success:          { bg: '#dcfce7', color: '#16a34a' },
    partial:          { bg: '#fef3c7', color: '#d97706' },
    error:            { bg: '#fee2e2', color: '#dc2626' },
  }
  const s = map[status] ?? { bg: '#f1f5f9', color: '#475569' }
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, background: s.bg, color: s.color,
      textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap',
    }}>
      {status?.replace(/_/g, ' ')}
    </span>
  )
}

// ─── Urgent Badge ────────────────────────────────────────────
export function UrgentBadge() {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 20,
      fontSize: 10, fontWeight: 800, background: '#fee2e2', color: '#dc2626',
      marginLeft: 6, letterSpacing: '0.05em',
    }}>
      URGENT
    </span>
  )
}

// ─── Loading Spinner ─────────────────────────────────────────
export function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12 }}>
      <div style={{
        width: 36, height: 36, border: '3px solid #e2e8f0',
        borderTop: '3px solid #6366f1', borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <p style={{ color: '#94a3b8', fontSize: 13 }}>{label}</p>
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────────
export function EmptyState({ icon = '📭', title = 'No data yet', subtitle }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 8 }}>
      <div style={{ fontSize: 40 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: '#94a3b8' }}>{subtitle}</div>}
    </div>
  )
}

// ─── Card ────────────────────────────────────────────────────
export function Card({ children, style }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '20px 24px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20, ...style,
    }}>
      {children}
    </div>
  )
}

// ─── Card Header ─────────────────────────────────────────────
export function CardHeader({ title, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{title}</h3>
      {action}
    </div>
  )
}

// ─── Stat Card ───────────────────────────────────────────────
export function StatCard({ label, value, trend, color }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: 20,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      borderTop: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, color }}>{value ?? '—'}</div>
      <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginTop: 6 }}>{label}</div>
      {trend && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{trend}</div>}
    </div>
  )
}

// ─── Info Box ────────────────────────────────────────────────
export function InfoBox({ children, variant = 'info' }) {
  const variants = {
    info:    { bg: '#f0f9ff', border: '#bae6fd', color: '#0369a1' },
    warning: { bg: '#fffbeb', border: '#fcd34d', color: '#92400e' },
    danger:  { bg: '#fef2f2', border: '#fecaca', color: '#dc2626' },
    success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d' },
  }
  const v = variants[variant]
  return (
    <div style={{
      background: v.bg, border: `1px solid ${v.border}`, borderRadius: 8,
      padding: '10px 14px', fontSize: 13, color: v.color,
      marginBottom: 16, lineHeight: 1.6,
    }}>
      {children}
    </div>
  )
}

// ─── Form Field ──────────────────────────────────────────────
export function FormField({ label, value, onChange, placeholder, type = 'text', span, required }) {
  return (
    <div style={span === 2 ? { gridColumn: 'span 2' } : {}}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      <input
        type={type} value={value} required={required}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0',
          borderRadius: 8, fontSize: 14, color: '#1e293b', outline: 'none',
          background: '#fafafa', boxSizing: 'border-box', fontFamily: 'inherit',
        }}
      />
    </div>
  )
}

// ─── Textarea Field ──────────────────────────────────────────
export function TextareaField({ label, value, onChange, placeholder, rows = 4 }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </label>
      <textarea
        value={value} rows={rows}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0',
          borderRadius: 8, fontSize: 14, color: '#1e293b', outline: 'none',
          background: '#fafafa', boxSizing: 'border-box', fontFamily: 'inherit',
          resize: 'vertical',
        }}
      />
    </div>
  )
}

// ─── Buttons ─────────────────────────────────────────────────
export function BtnPrimary({ children, onClick, disabled, style }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '10px 22px', borderRadius: 8, border: 'none',
      background: disabled ? '#e2e8f0' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      color: disabled ? '#94a3b8' : '#fff', fontWeight: 700, fontSize: 14,
      cursor: disabled ? 'not-allowed' : 'pointer', ...style,
    }}>
      {children}
    </button>
  )
}

export function BtnOutline({ children, onClick, disabled, style }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '10px 22px', borderRadius: 8, border: '1.5px solid #e2e8f0',
      background: '#fff', color: '#475569', fontWeight: 600, fontSize: 14,
      cursor: disabled ? 'not-allowed' : 'pointer', ...style,
    }}>
      {children}
    </button>
  )
}

export function BtnAction({ children, onClick, color = '#475569', bg = '#f1f5f9' }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 12px', borderRadius: 6, border: 'none',
      background: bg, color, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    }}>
      {children}
    </button>
  )
}

// ─── Table ───────────────────────────────────────────────────
export function Table({ headers, children }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {headers.map(h => (
            <th key={h} style={{
              padding: '10px 12px', textAlign: 'left', fontSize: 11,
              fontWeight: 700, color: '#64748b', borderBottom: '1px solid #f1f5f9',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  )
}

export function Td({ children, style }) {
  return <td style={{ padding: '12px', fontSize: 13.5, color: '#334155', borderBottom: '1px solid #f8fafc', ...style }}>{children}</td>
}

// ─── Avatar ──────────────────────────────────────────────────
export function Avatar({ name, color = '#6366f1', size = 28 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: color,
      color: '#fff', fontSize: size * 0.45, fontWeight: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

// ─── Progress Bar ────────────────────────────────────────────
export function ProgressBar({ percent, color = '#6366f1' }) {
  return (
    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(percent, 100)}%`, background: color, borderRadius: 3, transition: 'width 0.5s' }} />
    </div>
  )
}

// ─── Tabs ────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#f1f5f9', padding: 4, borderRadius: 10, width: 'fit-content' }}>
      {tabs.map(([key, label]) => (
        <button key={key} onClick={() => onChange(key)} style={{
          padding: '8px 18px', borderRadius: 7, border: 'none',
          background: active === key ? '#fff' : 'transparent',
          cursor: 'pointer', fontSize: 13.5, fontWeight: 600,
          color: active === key ? '#6366f1' : '#64748b',
          boxShadow: active === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
        }}>
          {label}
        </button>
      ))}
    </div>
  )
}

// ─── Coming Soon ─────────────────────────────────────────────
export function ComingSoon({ page }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, gap: 10 }}>
      <div style={{ fontSize: 48 }}>🚧</div>
      <h2 style={{ color: '#1e293b', margin: 0 }}>{page}</h2>
      <p style={{ color: '#64748b', margin: 0 }}>Coming in Day 3 of the build.</p>
    </div>
  )
}

// ─── Date helpers ────────────────────────────────────────────
export function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function daysSince(d) {
  if (!d) return 0
  return Math.floor((Date.now() - new Date(d)) / 86400000)
}