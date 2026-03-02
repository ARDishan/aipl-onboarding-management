import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import {
  Card, CardHeader, LoadingSpinner, EmptyState,
  BtnPrimary, BtnOutline, Avatar, StatusBadge,
  ProgressBar, fmtDate, daysSince,
} from '../components/shared'

function useTeamOnboarding() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data, error } = await supabase
      .from('onboarding_cases')
      .select(`
        *,
        employee:employee_id (*),
        milestones:onboarding_milestones (*)
      `)
      .in('status', ['initiated', 'in_progress'])
      .order('initiated_at', { ascending: false })
    if (!error) setData(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  return { data, loading, refetch: load }
}

export default function SupervisorEvalPage() {
  const { data: cases, loading, refetch } = useTeamOnboarding()
  const [selected, setSelected] = useState(null)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1.5fr' : '1fr', gap: 20 }}>
      {/* Left — Team list */}
      <Card>
        <CardHeader title="Team Probation Overview" />
        {loading
          ? <LoadingSpinner />
          : !cases?.length
            ? <EmptyState icon="👥" title="No active probations" subtitle="No team members currently on probation." />
            : cases.map(c => {
                const daysIn    = daysSince(c.employee?.date_of_joining)
                const pct       = Math.min(100, Math.round((daysIn / 180) * 100))
                const monthsIn  = Math.floor(daysIn / 30)
                const completed = c.milestones?.filter(m => m.status === 'completed').length ?? 0
                const total     = c.milestones?.length ?? 0

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelected(c)}
                    style={{
                      padding: '14px 12px', borderRadius: 10, cursor: 'pointer',
                      marginBottom: 8, transition: 'all 0.15s',
                      background: selected?.id === c.id ? '#f5f3ff' : '#f8fafc',
                      border: `1.5px solid ${selected?.id === c.id ? '#8b5cf6' : 'transparent'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <Avatar name={c.employee?.full_name} color="#8b5cf6" size={36} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{c.employee?.full_name}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{c.employee?.designation} · Month {monthsIn + 1} of 6</div>
                      </div>
                      <StatusBadge status={c.employee?.status} />
                    </div>
                    <ProgressBar percent={pct} color="#8b5cf6" />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#94a3b8' }}>
                      <span>Day {daysIn + 1} of 180</span>
                      <span>{completed}/{total} milestones done</span>
                    </div>
                  </div>
                )
              })
        }
      </Card>

      {/* Right — Evaluation panel */}
      {selected && (
        <EvaluationPanel
          onboarding={selected}
          onClose={() => setSelected(null)}
          onDone={() => { setSelected(null); refetch() }}
        />
      )}
    </div>
  )
}

// ─── Evaluation Panel ────────────────────────────────────────
function EvaluationPanel({ onboarding, onClose, onDone }) {
  const { showToast, authUser } = useApp()
  const emp = onboarding.employee
  const milestones = onboarding.milestones ?? []

  const [decision, setDecision]   = useState('')
  const [notes, setNotes]         = useState('')
  const [extendBy, setExtendBy]   = useState('30')
  const [submitting, setSubmitting] = useState(false)

  const daysIn   = daysSince(emp?.date_of_joining)
  const daysLeft = Math.max(0, 180 - daysIn)
  const canConfirm = daysIn >= 150 // allow confirmation after month 5

  const handleSubmit = async () => {
    if (!decision) return
    setSubmitting(true)
    try {
      const { data: profile } = await supabase
        .from('profiles').select('id').eq('id', authUser.id).single()

      // 1. Update employee status
      const statusMap = {
        confirm:  'confirmed',
        extend:   'extended',
        flag_hr:  'on_probation',
      }
      const newStatus = statusMap[decision]

      const empUpdate = { status: newStatus }
      if (decision === 'confirm') {
        empUpdate.confirmed_date = new Date().toISOString().split('T')[0]
      }
      if (decision === 'extend') {
        const newEnd = new Date(emp.probation_end_date)
        newEnd.setDate(newEnd.getDate() + parseInt(extendBy))
        empUpdate.probation_end_date = newEnd.toISOString().split('T')[0]
      }
      await supabase.from('employees').update(empUpdate).eq('id', emp.id)

      // 2. Update onboarding case status
      const caseStatus = decision === 'confirm' ? 'completed' : 'in_progress'
      await supabase.from('onboarding_cases')
        .update({ status: caseStatus })
        .eq('id', onboarding.id)

      // 3. Notify HR
      const { data: hrProfile } = await supabase
        .from('profiles').select('id').eq('role', 'hr_manager').limit(1).single()

      const notifMap = {
        confirm:  { title: `✅ Probation Confirmed — ${emp.full_name}`, message: `Supervisor has confirmed ${emp.full_name} for permanent employment. Awaiting HR final sign-off.` },
        extend:   { title: `⏳ Probation Extended — ${emp.full_name}`, message: `Supervisor has extended ${emp.full_name}'s probation by ${extendBy} days. Notes: ${notes}` },
        flag_hr:  { title: `🚩 HR Review Required — ${emp.full_name}`, message: `Supervisor has flagged ${emp.full_name} for HR review. Notes: ${notes}` },
      }

      if (hrProfile) {
        await supabase.from('notifications').insert({
          recipient_id: hrProfile.id,
          type: decision === 'confirm' ? 'confirmation' : 'evaluation',
          ...notifMap[decision],
          employee_id: emp.id,
          onboarding_case_id: onboarding.id,
        })
      }

      // 4. Notify Employee
      if (emp.profile_id) {
        const empNotif = {
          confirm: { title: '🎉 Congratulations! Probation Confirmed', message: 'Your supervisor has recommended you for confirmation. HR will follow up shortly.' },
          extend:  { title: '📅 Probation Extended', message: `Your probation period has been extended by ${extendBy} days. Please speak to your supervisor for details.` },
          flag_hr: { title: '📋 HR Review Scheduled', message: 'Your supervisor has requested an HR review of your probation. HR will be in touch.' },
        }
        await supabase.from('notifications').insert({
          recipient_id: emp.profile_id,
          type: 'evaluation',
          ...empNotif[decision],
          employee_id: emp.id,
        })
      }

      const successMsg = {
        confirm: `${emp.full_name} confirmed! HR notified.`,
        extend:  `Probation extended by ${extendBy} days.`,
        flag_hr: `Flagged for HR review.`,
      }
      showToast(successMsg[decision])
      onDone()
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: '#1e293b' }}>
            Evaluate: {emp?.full_name}
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
            {emp?.designation} · {emp?.department} · Day {daysIn + 1} of 180
          </p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
      </div>

      {/* Probation progress */}
      <div style={{ background: '#f5f3ff', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
          <span style={{ fontWeight: 700, color: '#6d28d9' }}>Probation Progress</span>
          <span style={{ color: '#64748b' }}>{daysLeft} days remaining</span>
        </div>
        <ProgressBar percent={Math.min(100, Math.round((daysIn / 180) * 100))} color="#8b5cf6" />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#94a3b8' }}>
          <span>Joined {fmtDate(emp?.date_of_joining)}</span>
          <span>Ends {fmtDate(emp?.probation_end_date)}</span>
        </div>
      </div>

      {/* Milestone summary */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>Milestone Summary</div>
        {milestones.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
            <span style={{ fontSize: 16 }}>
              {m.status === 'completed' ? '✅' : m.status === 'in_progress' ? '🔄' : '⬜'}
            </span>
            <span style={{ flex: 1, color: '#334155' }}>Month {m.month_number}: {m.title}</span>
            <StatusBadge status={m.status} />
          </div>
        ))}
      </div>

      {/* Evaluation notes */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Evaluation Notes
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Add your evaluation notes, observations, and recommendations..."
          style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, color: '#1e293b', outline: 'none', background: '#fafafa', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
        />
      </div>

      {/* Decision buttons */}
      <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Decision
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          { key: 'confirm', label: '✅ Confirm',    desc: 'Recommend for permanent employment', color: '#10b981', bg: '#dcfce7', disabled: !canConfirm },
          { key: 'extend',  label: '⏳ Extend',     desc: 'Extend probation period',             color: '#f59e0b', bg: '#fef3c7', disabled: false },
          { key: 'flag_hr', label: '🚩 Flag for HR', desc: 'Escalate to HR for review',          color: '#ef4444', bg: '#fee2e2', disabled: false },
        ].map(opt => (
          <div
            key={opt.key}
            onClick={() => !opt.disabled && setDecision(opt.key)}
            style={{
              border: `2px solid ${decision === opt.key ? opt.color : '#e2e8f0'}`,
              background: decision === opt.key ? opt.bg : opt.disabled ? '#f8fafc' : '#fafafa',
              borderRadius: 10, padding: '12px 10px', cursor: opt.disabled ? 'not-allowed' : 'pointer',
              textAlign: 'center', transition: 'all 0.15s',
              opacity: opt.disabled ? 0.5 : 1,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, color: decision === opt.key ? opt.color : '#475569' }}>{opt.label}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{opt.desc}</div>
          </div>
        ))}
      </div>

      {!canConfirm && (
        <div style={{ fontSize: 12, color: '#f59e0b', marginBottom: 12, background: '#fffbeb', padding: '8px 12px', borderRadius: 6 }}>
          ⚠️ Confirmation is available after Day 150 (Month 5). Currently Day {daysIn + 1}.
        </div>
      )}

      {/* Extend duration picker */}
      {decision === 'extend' && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Extend By
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['30', '60', '90'].map(d => (
              <button key={d} onClick={() => setExtendBy(d)} style={{
                flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer',
                border: `2px solid ${extendBy === d ? '#f59e0b' : '#e2e8f0'}`,
                background: extendBy === d ? '#fef3c7' : '#fafafa',
                fontWeight: 700, fontSize: 14,
                color: extendBy === d ? '#d97706' : '#475569',
              }}>
                {d} days
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Submit */}
      <div style={{ display: 'flex', gap: 10, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
        <BtnOutline onClick={onClose} disabled={submitting}>Cancel</BtnOutline>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleSubmit}
          disabled={!decision || submitting}
          style={{
            padding: '11px 28px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 14,
            cursor: !decision || submitting ? 'not-allowed' : 'pointer',
            background: !decision || submitting ? '#e2e8f0'
              : decision === 'confirm' ? 'linear-gradient(135deg, #059669, #10b981)'
              : decision === 'extend'  ? 'linear-gradient(135deg, #d97706, #f59e0b)'
              : 'linear-gradient(135deg, #dc2626, #ef4444)',
            color: !decision || submitting ? '#94a3b8' : '#fff',
          }}
        >
          {submitting ? '⟳ Submitting...' : `Submit Evaluation`}
        </button>
      </div>
    </Card>
  )
}