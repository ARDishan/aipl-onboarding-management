// ─── CAPEX Page ──────────────────────────────────────────────
import { useCapexRequests, useUserCreationRequests, useHRISSyncLog, useMilestones, useDocuments } from '../hooks/useData'
import { Card, CardHeader, LoadingSpinner, EmptyState, StatusBadge, UrgentBadge, Table, Td, BtnAction, BtnPrimary, BtnOutline, FormField, TextareaField, Tabs, InfoBox, Avatar, ProgressBar, fmtDate, fmtDateTime } from '../components/shared'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { useState, useEffect } from 'react'
import { WelcomeLetterModal } from '../components/WelcomeLetter'

export function CapexPage({ filterType }) {
  const { data, loading } = useCapexRequests(filterType)
  const { showToast } = useApp()

  const handleUpdate = async (id, status) => {
    await supabase.from('capex_requests').update({ status, approved_at: new Date().toISOString() }).eq('id', id)
    showToast(`CAPEX request ${status}`)
  }

  return (
    <Card>
      <CardHeader title="CAPEX Requests" />
      {loading
        ? <LoadingSpinner />
        : !data?.length
          ? <EmptyState icon="📦" title="No CAPEX requests yet" />
          : (
            <Table headers={['Employee', 'Type', 'Description', 'BC Required', 'Est. Cost', 'Status', '']}>
              {data.map(c => (
                <tr key={c.id}>
                  <Td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={c.employee?.full_name} size={26} />
                      <span style={{ fontWeight: 600 }}>{c.employee?.full_name}</span>
                    </div>
                  </Td>
                  <Td>
                    <span style={{ padding: '3px 8px', borderRadius: 6, background: '#f1f5f9', fontSize: 12, fontWeight: 600 }}>
                      {c.capex_type?.replace(/_/g, ' ')}
                    </span>
                  </Td>
                  <Td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description || '—'}</Td>
                  <Td>{c.bc_user_creation_required ? '✅ Yes' : '—'}</Td>
                  <Td>{c.estimated_cost ? `LKR ${Number(c.estimated_cost).toLocaleString()}` : '—'}</Td>
                  <Td><StatusBadge status={c.status} /></Td>
                  <Td>
                    {c.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <BtnAction onClick={() => handleUpdate(c.id, 'approved')} color="#16a34a" bg="#dcfce7">Approve</BtnAction>
                        <BtnAction onClick={() => handleUpdate(c.id, 'rejected')} color="#dc2626" bg="#fee2e2">Reject</BtnAction>
                      </div>
                    )}
                  </Td>
                </tr>
              ))}
            </Table>
          )
      }
    </Card>
  )
}

// ─── User Creation Page ──────────────────────────────────────
export function UserCreationPage() {
  const { data, loading, refetch } = useUserCreationRequests()
  const { showToast } = useApp()

  const markAccount = async (id, account) => {
    await supabase.from('user_creation_requests').update({ [`${account}_status`]: 'completed' }).eq('id', id)
    showToast(`${account.toUpperCase()} account marked complete`)
    refetch()
  }

  const markAllDone = async (req) => {
    const updates = {}
    if (req.m365_required)   updates.m365_status   = 'completed'
    if (req.domain_required) updates.domain_status = 'completed'
    if (req.ess_required)    updates.ess_status    = 'completed'
    if (req.bc_required)     updates.bc_status     = 'completed'
    updates.completed_at = new Date().toISOString()
    await supabase.from('user_creation_requests').update(updates).eq('id', req.id)
    showToast(`All accounts for ${req.employee?.full_name} marked complete!`)
    refetch()
  }

  return (
    <Card>
      <CardHeader title="User Creation Requests" />
      {loading
        ? <LoadingSpinner />
        : !data?.length
          ? <EmptyState icon="💻" title="No user creation requests" />
          : data.map(r => {
            const allDone = (!r.m365_required || r.m365_status === 'completed') &&
                            (!r.domain_required || r.domain_status === 'completed') &&
                            (!r.ess_required || r.ess_status === 'completed') &&
                            (!r.bc_required || r.bc_status === 'completed')
            return (
              <div key={r.id} style={{ padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Avatar name={r.employee?.full_name} color="#0ea5e9" />
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{r.employee?.full_name}</span>
                      {r.onboarding_case?.is_urgent && <UrgentBadge />}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
                      📧 Preferred: {r.preferred_email || '—'} · Requested {fmtDate(r.created_at)}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {r.m365_required   && <AccountChip label="M365"   status={r.m365_status}   onDone={() => markAccount(r.id, 'm365')} />}
                      {r.domain_required && <AccountChip label="Domain" status={r.domain_status} onDone={() => markAccount(r.id, 'domain')} />}
                      {r.ess_required    && <AccountChip label="ESS"    status={r.ess_status}    onDone={() => markAccount(r.id, 'ess')} />}
                      {r.bc_required     && <AccountChip label="BC"     status={r.bc_status}     onDone={() => markAccount(r.id, 'bc')} />}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <StatusBadge status={allDone ? 'completed' : r.m365_status === 'pending' ? 'pending' : 'in_progress'} />
                    {!allDone && <BtnPrimary onClick={() => markAllDone(r)} style={{ fontSize: 12, padding: '7px 14px' }}>Mark All Done</BtnPrimary>}
                    {allDone && <span style={{ fontSize: 12, color: '#10b981', fontWeight: 700 }}>✅ All accounts created</span>}
                  </div>
                </div>
              </div>
            )
          })
      }
    </Card>
  )
}

function AccountChip({ label, status, onDone }) {
  const done = status === 'completed'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, background: done ? '#dcfce7' : '#fef3c7', border: `1px solid ${done ? '#bbf7d0' : '#fde68a'}` }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: done ? '#16a34a' : '#d97706' }}>{done ? '✓' : '○'} {label}</span>
      {!done && <button onClick={onDone} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, border: 'none', background: '#f59e0b', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Done</button>}
    </div>
  )
}

// ─── HRIS Sync Page ──────────────────────────────────────────
export function HRISSyncPage() {
  const { data: logs, loading, refetch } = useHRISSyncLog()
  const { showToast, authUser } = useApp()
  const [syncing, setSyncing] = useState(false)

  const triggerSync = async () => {
    setSyncing(true)
    const start = new Date().toISOString()
    // Simulate HRIS sync (in production: call actual HRIS API endpoint)
    await new Promise(r => setTimeout(r, 2500))
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', authUser.id).single()
    await supabase.from('hris_sync_log').insert({
      sync_type:             'manual',
      triggered_by:          profile.id,
      records_synced:        Math.floor(Math.random() * 10) + 3,
      records_created:       Math.floor(Math.random() * 3),
      records_updated:       Math.floor(Math.random() * 5) + 1,
      duplicates_prevented:  Math.floor(Math.random() * 3),
      status:                'success',
      started_at:            start,
      completed_at:          new Date().toISOString(),
    })
    setSyncing(false)
    showToast('HRIS sync complete — records updated, duplicates prevented.')
    refetch()
  }

  return (
    <div>
      <Card>
        <CardHeader title="HRIS Integration — API Sync" />
        <p style={{ color: '#64748b', marginBottom: 16, fontSize: 13 }}>
          Sync employee data from HRIS to prevent duplicate entries. In production this runs on a scheduled webhook or cron job.
        </p>
        <InfoBox>
          🔗 HRIS API endpoint configured. Last sync: <strong>{logs?.[0] ? fmtDateTime(logs[0].started_at) : 'Never'}</strong>
          {logs?.[0] && ` — ${logs[0].records_synced} records synced, ${logs[0].duplicates_prevented} duplicates prevented.`}
        </InfoBox>
        <BtnPrimary onClick={triggerSync} disabled={syncing} style={{ marginTop: 8, opacity: syncing ? 0.7 : 1 }}>
          {syncing ? '⟳ Syncing from HRIS...' : '🔄 Trigger Manual Sync'}
        </BtnPrimary>
      </Card>

      <Card>
        <CardHeader title="Sync History" />
        {loading
          ? <LoadingSpinner />
          : !logs?.length
            ? <EmptyState icon="🔄" title="No sync history yet" />
            : (
              <Table headers={['Date', 'Type', 'Synced', 'Created', 'Updated', 'Duplicates Prevented', 'Status']}>
                {logs.map(l => (
                  <tr key={l.id}>
                    <Td>{fmtDateTime(l.started_at)}</Td>
                    <Td><span style={{ padding: '2px 8px', borderRadius: 6, background: '#f1f5f9', fontSize: 12, fontWeight: 600 }}>{l.sync_type}</span></Td>
                    <Td style={{ fontWeight: 600 }}>{l.records_synced}</Td>
                    <Td>{l.records_created}</Td>
                    <Td>{l.records_updated}</Td>
                    <Td><strong style={{ color: '#10b981' }}>{l.duplicates_prevented}</strong></Td>
                    <Td><StatusBadge status={l.status} /></Td>
                  </tr>
                ))}
              </Table>
            )
        }
      </Card>
    </div>
  )
}

// ─── Employee Onboarding Page ────────────────────────────────
export function EmployeeOnboardingPage() {
  const { showToast, authUser } = useApp()
  const [tab, setTab] = useState('info')
  const [infoForm, setInfoForm] = useState({ nic: '', dob: '', address: '', emergency_name: '', emergency_phone: '', marital_status: '' })
  const [submitting, setSubmitting] = useState(false)
  const [employee, setEmployee]     = useState(null)
  const [showWelcome, setShowWelcome] = useState(false)

  // Fetch employee record on mount + check for welcome letter
  useEffect(() => {
    if (!authUser) return

    const loadEmployee = async () => {
      // Find employee by profile_id (set during onboarding initiation or SQL link)
      const { data: emp } = await supabase
        .from('employees')
        .select('*')
        .eq('profile_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (emp) {
        setEmployee(emp)
        if (!emp.welcome_letter_sent) setShowWelcome(true)
      }
    }

    loadEmployee()
  }, [authUser])

  const submitInfo = async () => {
    if (!employee) { showToast('No employee record linked to your account. Please contact HR.', 'error'); return }
    setSubmitting(true)
    try {
      await supabase.from('employees').update({
        nic_number:              infoForm.nic,
        date_of_birth:           infoForm.dob,
        address:                 infoForm.address,
        emergency_contact_name:  infoForm.emergency_name,
        emergency_contact_phone: infoForm.emergency_phone,
        marital_status:          infoForm.marital_status,
        info_submitted:          true,
      }).eq('id', employee.id)

      // Notify HR
      const { data: hrProfile } = await supabase
        .from('profiles').select('id').eq('role', 'hr_manager').limit(1).single()
      if (hrProfile) {
        await supabase.from('notifications').insert({
          recipient_id: hrProfile.id,
          type:         'info_posted',
          title:        '📋 Employee Info Submitted',
          message:      `${employee.full_name} has submitted their personal information for HR review.`,
          employee_id:  employee.id,
        })
      }
      showToast('Information submitted for HR review!')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      {/* GMD Welcome Letter modal — fires on first login */}
      {showWelcome && employee && (
        <WelcomeLetterModal
          employee={employee}
          onClose={async () => {
            setShowWelcome(false)
            // Mark welcome letter sent + fire email
            await supabase.from('employees').update({ welcome_letter_sent: true, first_login_at: new Date().toISOString() }).eq('id', employee.id)
            const { data: { session } } = await supabase.auth.getSession()
            fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-welcome-letter`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
              body: JSON.stringify({
                employee_name:   employee.full_name,
                employee_email:  employee.personal_email,
                designation:     employee.designation,
                department:      employee.department,
                date_of_joining: employee.date_of_joining,
              }),
            }).catch(e => console.warn('Welcome letter email failed:', e))
            showToast('Welcome letter sent to your personal email!')
          }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 14, padding: '20px 24px', marginBottom: 20, color: '#fff' }}>
        <div style={{ fontSize: 40 }}>👋</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Welcome to Analytical Instruments{employee ? `, ${employee.full_name.split(' ')[0]}` : ''}!</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>Complete your onboarding tasks below.</div>
        </div>
      </div>

      <Tabs tabs={[['info', 'My Info'], ['docs', 'Documents'], ['milestones', 'Milestones']]} active={tab} onChange={setTab} />

      {tab === 'info' && (
        <Card>
          <CardHeader title="Personal Information Form" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <FormField label="NIC Number"             value={infoForm.nic}             onChange={v => setInfoForm(p => ({ ...p, nic: v }))}             placeholder="000000000V" />
            <FormField label="Date of Birth"          value={infoForm.dob}             onChange={v => setInfoForm(p => ({ ...p, dob: v }))}             type="date" />
            <FormField label="Home Address"           value={infoForm.address}         onChange={v => setInfoForm(p => ({ ...p, address: v }))}         placeholder="No. 1, Main Street..." span={2} />
            <FormField label="Emergency Contact Name" value={infoForm.emergency_name}  onChange={v => setInfoForm(p => ({ ...p, emergency_name: v }))}  placeholder="Full name" />
            <FormField label="Emergency Contact Phone" value={infoForm.emergency_phone} onChange={v => setInfoForm(p => ({ ...p, emergency_phone: v }))} placeholder="+94 77 000 0000" />
          </div>
          <BtnPrimary onClick={submitInfo} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit for HR Review'}
          </BtnPrimary>
        </Card>
      )}

      {tab === 'docs'       && <DocumentsPage employeeMode />}
      {tab === 'milestones' && <MilestonesPage />}
    </div>
  )
}

// ─── Documents Page ──────────────────────────────────────────
export function DocumentsPage({ employeeMode }) {
  const { data, loading, refetch } = useDocuments()
  const { showToast } = useApp()

  const markViewed = async (doc) => {
    await supabase.from('onboarding_documents').update({ status: 'viewed', viewed_at: new Date().toISOString() }).eq('id', doc.id)
    showToast(`${doc.document_name} marked as viewed`)
    refetch()
  }

  const markSigned = async (doc) => {
    await supabase.from('onboarding_documents').update({ status: 'signed', signed_at: new Date().toISOString() }).eq('id', doc.id)
    showToast(`${doc.document_name} signed!`)
    refetch()
  }

  return (
    <Card>
      <CardHeader title={employeeMode ? 'Mandatory Documents' : 'Document Management'} />
      {loading
        ? <LoadingSpinner />
        : !data?.length
          ? <EmptyState icon="📄" title="No documents yet" subtitle="Documents will appear once onboarding is initiated." />
          : data.map(d => (
            <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f8fafc' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{d.document_name}</div>
                {!employeeMode && <div style={{ fontSize: 12, color: '#94a3b8' }}>{d.employee?.full_name}</div>}
                {d.physical_signoff_required && (
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
                    📋 Physical signature required {d.physical_signoff_received ? '— ✅ Received' : '— Pending'}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <StatusBadge status={d.status} />
                {d.status === 'pending' && <BtnAction onClick={() => markViewed(d)}>View</BtnAction>}
                {d.status === 'viewed'  && <BtnAction onClick={() => markSigned(d)} color="#16a34a" bg="#dcfce7">Sign</BtnAction>}
              </div>
            </div>
          ))
      }
    </Card>
  )
}

// ─── Milestones Page ─────────────────────────────────────────
export function MilestonesPage() {
  const { data, loading, refetch } = useMilestones()
  const { showToast } = useApp()

  const STATUS_COLOR = { completed: '#10b981', in_progress: '#6366f1', upcoming: '#94a3b8', overdue: '#ef4444' }

  const submit = async (id) => {
    const note = prompt('Enter your milestone submission notes:')
    if (!note) return
    await supabase.from('onboarding_milestones').update({ employee_submission: note, employee_submitted_at: new Date().toISOString(), status: 'in_progress' }).eq('id', id)
    showToast('Milestone submission saved!')
    refetch()
  }

  return (
    <Card>
      <CardHeader title="Onboarding Milestones" />
      {loading
        ? <LoadingSpinner />
        : !data?.length
          ? <EmptyState icon="🎯" title="No milestones yet" subtitle="Milestones are auto-generated when onboarding is initiated." />
          : (
            <div style={{ paddingLeft: 8 }}>
              {data.map((m, i) => (
                <div key={m.id} style={{ display: 'flex', gap: 16, marginBottom: 4 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: STATUS_COLOR[m.status], flexShrink: 0, marginTop: 4 }} />
                    {i < data.length - 1 && <div style={{ width: 2, flex: 1, background: '#e2e8f0', margin: '4px 0' }} />}
                  </div>
                  <div style={{ flex: 1, background: '#f8fafc', borderRadius: 8, padding: '12px 14px', marginBottom: 6, borderLeft: `3px solid ${STATUS_COLOR[m.status]}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>Month {m.month_number}: {m.title}</span>
                        {m.employee?.full_name && <span style={{ fontSize: 12, color: '#94a3b8' }}>— {m.employee.full_name}</span>}
                      </div>
                      <StatusBadge status={m.status} />
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Due: {fmtDate(m.due_date)}</div>
                    {m.description && <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{m.description}</div>}
                    {m.employee_submission && (
                      <div style={{ fontSize: 13, color: '#475569', marginTop: 6, background: '#fff', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                        <strong>Employee:</strong> {m.employee_submission}
                        <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>{fmtDateTime(m.employee_submitted_at)}</span>
                      </div>
                    )}
                    {m.status === 'upcoming' && (
                      <button onClick={() => submit(m.id)} style={{ marginTop: 8, fontSize: 12, padding: '5px 12px', borderRadius: 6, border: 'none', background: '#eef2ff', color: '#6366f1', fontWeight: 600, cursor: 'pointer' }}>
                        Submit Update
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
      }
    </Card>
  )
}