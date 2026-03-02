import { useState, useEffect } from 'react'
import { useSLATracking } from '../hooks/useData'
import { Card, CardHeader, StatCard, LoadingSpinner, EmptyState, StatusBadge, UrgentBadge, BtnAction, ProgressBar, fmtDateTime } from '../components/shared'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'

export default function SLAMonitorPage() {
  const { data: slaList, loading, refetch } = useSLATracking()
  const { showToast } = useApp()

  const active   = slaList?.filter(s => s.status === 'active')   ?? []
  const breached = slaList?.filter(s => s.status === 'breached') ?? []
  const completed = slaList?.filter(s => s.status === 'completed') ?? []

  const handleEscalate = async (sla) => {
    await supabase.from('notifications').insert({
      recipient_id: sla.assigned_to,
      type: 'sla_breach',
      title: '🚨 SLA Escalated',
      message: `SLA for ${sla.onboarding_case?.employee?.full_name} has been escalated. Immediate action required.`,
      onboarding_case_id: sla.onboarding_case_id,
    })
    showToast('Escalation notification sent to IT Manager')
    refetch()
  }

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Active SLAs"    value={active.length}    trend="In progress"      color="#6366f1" />
        <StatCard label="Breached"       value={breached.length}  trend="Needs action"     color="#ef4444" />
        <StatCard label="Completed"      value={completed.length} trend="Successfully done" color="#10b981" />
        <StatCard label="Urgent Cases"   value={slaList?.filter(s => s.sla_type === 'urgent').length ?? 0} trend="24hr SLA"  color="#f59e0b" />
      </div>

      {loading && <LoadingSpinner />}

      {/* Breached — top priority */}
      {breached.length > 0 && (
        <Card style={{ borderTop: '4px solid #ef4444' }}>
          <CardHeader title="🚨 Breached SLAs" />
          {breached.map(s => (
            <SLARow key={s.id} sla={s} onEscalate={() => handleEscalate(s)} />
          ))}
        </Card>
      )}

      {/* Active */}
      <Card>
        <CardHeader title="Active SLAs" />
        {active.length === 0
          ? <EmptyState icon="✅" title="No active SLAs" subtitle="All SLAs are resolved." />
          : active.map(s => <SLARow key={s.id} sla={s} />)
        }
      </Card>

      {/* Completed */}
      <Card>
        <CardHeader title="Completed SLAs" />
        {completed.length === 0
          ? <EmptyState icon="📭" title="No completed SLAs yet" />
          : completed.map(s => <SLARow key={s.id} sla={s} />)
        }
      </Card>
    </div>
  )
}

// ─── SLA Row with live countdown ─────────────────────────────
function SLARow({ sla, onEscalate }) {
  const [remaining, setRemaining] = useState('')
  const [pct, setPct] = useState(0)

  useEffect(() => {
    const tick = () => {
      const now     = Date.now()
      const start   = new Date(sla.started_at).getTime()
      const end     = new Date(sla.target_deadline).getTime()
      const total   = end - start
      const elapsed = now - start
      const left    = end - now

      setPct(Math.min(100, Math.max(0, (elapsed / total) * 100)))

      if (sla.status === 'completed') { setRemaining('Completed'); return }
      if (sla.status === 'breached' || left <= 0) {
        const overMs  = Math.abs(Math.min(left, 0))
        const overH   = Math.floor(overMs / 3600000)
        const overM   = Math.floor((overMs % 3600000) / 60000)
        setRemaining(`Breached ${overH}h ${overM}m ago`)
        return
      }

      const h = Math.floor(left / 3600000)
      const m = Math.floor((left % 3600000) / 60000)
      const s = Math.floor((left % 60000) / 1000)
      setRemaining(`${h}h ${m}m ${s}s remaining`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [sla])

  const statusColor = { active: '#6366f1', breached: '#ef4444', completed: '#10b981' }[sla.status]
  const isUrgent = sla.sla_type === 'urgent'

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '16px', marginBottom: 10, background: '#f8fafc', borderRadius: 10,
      borderLeft: `4px solid ${statusColor}`,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
            {sla.onboarding_case?.employee?.full_name ?? 'Unknown'}
          </span>
          {isUrgent && <UrgentBadge />}
          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {sla.sla_type} SLA · {sla.target_hours}hr
          </span>
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{sla.task_description}</div>
        <ProgressBar percent={pct} color={statusColor} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Started: {fmtDateTime(sla.started_at)}</span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Deadline: {fmtDateTime(sla.target_deadline)}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, marginLeft: 24, minWidth: 180 }}>
        <StatusBadge status={sla.status} />
        <span style={{
          fontSize: 13, fontWeight: 700, fontFamily: 'monospace',
          color: sla.status === 'breached' ? '#ef4444' : sla.status === 'completed' ? '#10b981' : '#6366f1',
        }}>
          ⏱ {remaining}
        </span>
        {sla.status === 'breached' && onEscalate && (
          <BtnAction onClick={onEscalate} color="#dc2626" bg="#fee2e2">🚨 Escalate</BtnAction>
        )}
      </div>
    </div>
  )
}