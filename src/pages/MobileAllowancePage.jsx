import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { useMobileAllowance } from '../hooks/useData'
import {
  Card, CardHeader, LoadingSpinner, EmptyState,
  BtnPrimary, BtnOutline, BtnAction, Table, Td,
  StatusBadge, Avatar, FormField, fmtDate,
} from '../components/shared'

export default function MobileAllowancePage() {
  const { activeRole } = useApp()
  return activeRole === 'employee'
    ? <EmployeeMobileForm />
    : <HRMobileAllowanceTracker />
}

// ─── Employee — Submit request form ─────────────────────────
function EmployeeMobileForm() {
  const { showToast, authUser } = useApp()
  const { data: existing, refetch } = useMobileAllowance()
  const [form, setForm] = useState({ phone_number: '', network_provider: '', reason: '' })
  const [submitting, setSubmitting] = useState(false)

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const alreadySubmitted = existing?.some(r =>
    r.status === 'pending' || r.status === 'approved'
  )

  const handleSubmit = async () => {
    if (!form.phone_number || !form.network_provider || !form.reason) {
      showToast('Please fill in all fields', 'error')
      return
    }
    setSubmitting(true)
    try {
      // Get employee record
      const { data: emp } = await supabase
        .from('employees')
        .select('id, onboarding_cases(id)')
        .eq('profile_id', authUser.id)
        .single()

      if (!emp) throw new Error('Employee record not found. Please contact HR.')

      await supabase.from('mobile_allowance_requests').insert({
        employee_id:        emp.id,
        onboarding_case_id: emp.onboarding_cases?.[0]?.id ?? null,
        phone_number:       form.phone_number,
        network_provider:   form.network_provider,
        reason:             form.reason,
        status:             'pending',
        submitted_at:       new Date().toISOString(),
      })

      // Notify HR
      const { data: hrProfile } = await supabase
        .from('profiles').select('id').eq('role', 'hr_manager').limit(1).single()
      if (hrProfile) {
        await supabase.from('notifications').insert({
          recipient_id: hrProfile.id,
          type:    'mobile_allowance',
          title:   '📱 Mobile Allowance Request',
          message: `New mobile allowance request submitted for ${form.phone_number} (${form.network_provider}).`,
          employee_id: emp.id,
        })
      }

      showToast('Mobile allowance request submitted!')
      setForm({ phone_number: '', network_provider: '', reason: '' })
      refetch()
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <Card>
        <CardHeader title="📱 Mobile Allowance Request" />

        {alreadySubmitted ? (
          <div style={{ textAlign: 'center', padding: '32px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b', marginBottom: 8 }}>
              Request Already Submitted
            </div>
            <div style={{ color: '#64748b', fontSize: 14 }}>
              Your mobile allowance request has been submitted and is pending HR approval.
            </div>
          </div>
        ) : (
          <>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>
              Submit your mobile number for the company mobile allowance. HR will review and approve within 3 working days.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              <FormField
                label="Mobile Number"
                value={form.phone_number}
                onChange={v => set('phone_number', v)}
                placeholder="+94 77 000 0000"
                required
              />

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Network Provider <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={form.network_provider}
                  onChange={e => set('network_provider', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, color: '#1e293b', outline: 'none', background: '#fafafa', fontFamily: 'inherit' }}
                >
                  <option value="">Select provider...</option>
                  {['Dialog', 'Mobitel', 'Hutch', 'Airtel', 'SLT Mobitel'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Business Justification <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  value={form.reason}
                  onChange={e => set('reason', e.target.value)}
                  rows={3}
                  placeholder="Explain why you need a mobile allowance for your role..."
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, color: '#1e293b', outline: 'none', background: '#fafafa', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>
            </div>

            <BtnPrimary onClick={handleSubmit} disabled={submitting} style={{ width: '100%' }}>
              {submitting ? '⟳ Submitting...' : 'Submit Request'}
            </BtnPrimary>
          </>
        )}
      </Card>

      {/* Show own request history */}
      {existing?.length > 0 && (
        <Card>
          <CardHeader title="My Requests" />
          {existing.map(r => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f8fafc' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{r.phone_number} · {r.network_provider}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Submitted {fmtDate(r.submitted_at)}</div>
              </div>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

// ─── HR — All requests tracking table ────────────────────────
function HRMobileAllowanceTracker() {
  const { data, loading, refetch } = useMobileAllowance()
  const { showToast, authUser }    = useApp()

  const updateStatus = async (id, status, employeeId) => {
    await supabase.from('mobile_allowance_requests')
      .update({ status, approved_at: new Date().toISOString() })
      .eq('id', id)

    // Notify employee
    const { data: emp } = await supabase
      .from('employees').select('profile_id, full_name').eq('id', employeeId).single()
    if (emp?.profile_id) {
      await supabase.from('notifications').insert({
        recipient_id: emp.profile_id,
        type:    'mobile_allowance',
        title:   status === 'approved' ? '✅ Mobile Allowance Approved' : '❌ Mobile Allowance Rejected',
        message: status === 'approved'
          ? 'Your mobile allowance request has been approved.'
          : 'Your mobile allowance request has been rejected. Please contact HR for details.',
        employee_id: employeeId,
      })
    }

    showToast(`Request ${status} and employee notified.`)
    refetch()
  }

  const pending  = data?.filter(r => r.status === 'pending')  ?? []
  const resolved = data?.filter(r => r.status !== 'pending')  ?? []

  return (
    <div>
      {/* Pending */}
      <Card>
        <CardHeader title={`📱 Pending Mobile Allowance Requests ${pending.length > 0 ? `(${pending.length})` : ''}`} />
        {loading
          ? <LoadingSpinner />
          : pending.length === 0
            ? <EmptyState icon="📱" title="No pending requests" subtitle="All mobile allowance requests have been resolved." />
            : (
              <Table headers={['Employee', 'Phone', 'Network', 'Reason', 'Submitted', '']}>
                {pending.map(r => (
                  <tr key={r.id}>
                    <Td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={r.employee?.full_name} size={26} />
                        <div>
                          <div style={{ fontWeight: 600 }}>{r.employee?.full_name}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.employee?.designation}</div>
                        </div>
                      </div>
                    </Td>
                    <Td>{r.phone_number}</Td>
                    <Td>{r.network_provider}</Td>
                    <Td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.reason}
                    </Td>
                    <Td>{fmtDate(r.submitted_at)}</Td>
                    <Td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <BtnAction onClick={() => updateStatus(r.id, 'approved', r.employee_id)} color="#16a34a" bg="#dcfce7">Approve</BtnAction>
                        <BtnAction onClick={() => updateStatus(r.id, 'rejected', r.employee_id)} color="#dc2626" bg="#fee2e2">Reject</BtnAction>
                      </div>
                    </Td>
                  </tr>
                ))}
              </Table>
            )
        }
      </Card>

      {/* Resolved */}
      {resolved.length > 0 && (
        <Card>
          <CardHeader title="Resolved Requests" />
          <Table headers={['Employee', 'Phone', 'Network', 'Status', 'Date']}>
            {resolved.map(r => (
              <tr key={r.id}>
                <Td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar name={r.employee?.full_name} size={26} />
                    <span style={{ fontWeight: 600 }}>{r.employee?.full_name}</span>
                  </div>
                </Td>
                <Td>{r.phone_number}</Td>
                <Td>{r.network_provider}</Td>
                <Td><StatusBadge status={r.status} /></Td>
                <Td>{fmtDate(r.submitted_at)}</Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
    </div>
  )
}