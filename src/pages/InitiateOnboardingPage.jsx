import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { FormField, TextareaField, BtnPrimary, BtnOutline, InfoBox, Card } from '../components/shared'

const INITIAL = {
  // Step 1 — Employee
  full_name: '', designation: '', department: '', date_of_joining: '',
  personal_email: '', personal_phone: '', is_urgent: false,
  // Step 2 — JD
  job_title: '', confirmation_criteria: '', training_plan: '',
  // Step 3 — CAPEX
  capex_type: 'replacement_it', capex_description: '', estimated_cost: '',
  bc_user_creation_required: false,
  // Step 4 — User Creation
  m365_required: true, bc_required: false, domain_required: true, ess_required: true,
  preferred_email: '',
}

export default function InitiateOnboardingPage() {
  const { showToast, authUser } = useApp()
  const [step, setStep]       = useState(1)
  const [form, setForm]       = useState(INITIAL)
  const [submitting, setSubmitting] = useState(false)

  const set = (field, val) => setForm(p => ({ ...p, [field]: val }))

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      // 1. Get current user's profile id
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', authUser.id)
        .single()

      // 2. Insert Employee
      const { data: emp, error: empErr } = await supabase
        .from('employees')
        .insert({
          full_name:       form.full_name,
          designation:     form.designation,
          department:      form.department,
          date_of_joining: form.date_of_joining,
          personal_email:  form.personal_email,
          personal_phone:  form.personal_phone,
          status:          'on_probation',
          probation_end_date: new Date(new Date(form.date_of_joining).getTime() + 180 * 86400000).toISOString().split('T')[0],
          created_by:      profile.id,
        })
        .select()
        .single()
      if (empErr) throw empErr

      // 3. Insert Onboarding Case (triggers: milestones + SLA auto-created by DB)
      const { data: oc, error: ocErr } = await supabase
        .from('onboarding_cases')
        .insert({
          employee_id:           emp.id,
          initiated_by:          profile.id,
          job_title:             form.job_title,
          department:            form.department,
          confirmation_criteria: form.confirmation_criteria,
          training_plan:         form.training_plan,
          status:                'initiated',
          is_urgent:             form.is_urgent,
          target_completion_date: new Date(new Date(form.date_of_joining).getTime() + 180 * 86400000).toISOString().split('T')[0],
        })
        .select()
        .single()
      if (ocErr) throw ocErr

      // 4. Insert CAPEX Request
      const { error: capexErr } = await supabase
        .from('capex_requests')
        .insert({
          onboarding_case_id:        oc.id,
          employee_id:               emp.id,
          requested_by:              profile.id,
          capex_type:                form.capex_type,
          description:               form.capex_description,
          estimated_cost:            form.estimated_cost ? parseFloat(form.estimated_cost) : null,
          bc_user_creation_required: form.bc_user_creation_required,
          status:                    'pending',
          email_sent_to:             form.capex_type.includes('it') ? 'it@ai.lk' : 'admin@ai.lk',
        })
      if (capexErr) throw capexErr

      // 5. Insert User Creation Request
      const { error: ucrErr } = await supabase
        .from('user_creation_requests')
        .insert({
          onboarding_case_id: oc.id,
          employee_id:        emp.id,
          requested_by:       profile.id,
          m365_required:      form.m365_required,
          bc_required:        form.bc_required,
          domain_required:    form.domain_required,
          ess_required:       form.ess_required,
          preferred_email:    form.preferred_email,
        })
      if (ucrErr) throw ucrErr

      // 6. Notify IT manager (fetch IT profile first)
      const { data: itProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'it_manager')
        .limit(1)
        .single()

      if (itProfile) {
        await supabase.from('notifications').insert([
          {
            recipient_id:       itProfile.id,
            type:               'info_posted',
            title:              `💻 New User Creation Request — ${form.full_name}`,
            message:            `Accounts needed: ${[form.m365_required && 'M365', form.domain_required && 'Domain', form.ess_required && 'ESS', form.bc_required && 'BC'].filter(Boolean).join(', ')}${form.is_urgent ? ' | ⚡ URGENT' : ''}`,
            onboarding_case_id: oc.id,
            employee_id:        emp.id,
          }
        ])
      }

      showToast(`Onboarding initiated for ${form.full_name}! IT & Admin notified.`)
      setForm(INITIAL)
      setStep(1)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const STEPS = ['Employee Info', 'JD & Criteria', 'CAPEX', 'User Creation', 'Review']

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 28 }}>
        {STEPS.map((s, i) => {
          const done   = i + 1 < step
          const active = i + 1 === step
          return (
            <div key={i} onClick={() => done && setStep(i + 1)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative', cursor: done ? 'pointer' : 'default' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, zIndex: 1, transition: 'all 0.2s', background: done ? '#10b981' : active ? '#6366f1' : '#e2e8f0', color: done || active ? '#fff' : '#94a3b8' }}>
                {done ? '✓' : i + 1}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, marginTop: 6, textAlign: 'center', color: done ? '#10b981' : active ? '#6366f1' : '#94a3b8' }}>{s}</div>
              {i < STEPS.length - 1 && (
                <div style={{ position: 'absolute', top: 16, left: '50%', width: '100%', height: 2, background: done ? '#10b981' : '#e2e8f0', zIndex: 0 }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step 1 — Employee Info */}
      {step === 1 && (
        <Card>
          <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: '#1e293b' }}>Employee Information</h2>
          <p style={{ margin: '0 0 20px', fontSize: 13.5, color: '#64748b' }}>Enter the new employee's basic details.</p>

          <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: 14, gap: 8 }}>
              <input type="checkbox" checked={form.is_urgent} onChange={e => set('is_urgent', e.target.checked)} />
              <span style={{ fontWeight: 700, color: form.is_urgent ? '#ef4444' : '#64748b' }}>
                🚨 Urgent Onboarding — triggers expedited 24hr SLA
              </span>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <FormField label="Full Name"       value={form.full_name}       onChange={v => set('full_name', v)}       placeholder="Kavya Ranasinghe"   required />
            <FormField label="Designation"     value={form.designation}     onChange={v => set('designation', v)}     placeholder="QA Engineer"        required />
            <FormField label="Department"      value={form.department}      onChange={v => set('department', v)}      placeholder="Engineering"        required />
            <FormField label="Date of Joining" value={form.date_of_joining} onChange={v => set('date_of_joining', v)} type="date"                      required />
            <FormField label="Personal Email"  value={form.personal_email}  onChange={v => set('personal_email', v)}  placeholder="personal@gmail.com" type="email" />
            <FormField label="Personal Phone"  value={form.personal_phone}  onChange={v => set('personal_phone', v)}  placeholder="+94 77 000 0000" />
          </div>

          {form.date_of_joining && (
            <InfoBox>
              📅 <strong>7 onboarding milestones</strong> will be auto-generated from <strong>{new Date(form.date_of_joining).toDateString()}</strong>, spanning 6 months.
            </InfoBox>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
            <BtnPrimary onClick={() => setStep(2)} disabled={!form.full_name || !form.designation || !form.department || !form.date_of_joining}>
              Next: JD & Criteria →
            </BtnPrimary>
          </div>
        </Card>
      )}

      {/* Step 2 — JD & Criteria */}
      {step === 2 && (
        <Card>
          <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: '#1e293b' }}>Job Description & Confirmation Criteria</h2>
          <p style={{ margin: '0 0 20px', fontSize: 13.5, color: '#64748b' }}>Define role expectations and probation confirmation criteria.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <FormField label="Job Title" value={form.job_title} onChange={v => set('job_title', v)} placeholder="Senior QA Engineer" required />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
            <TextareaField label="Confirmation Criteria" value={form.confirmation_criteria} onChange={v => set('confirmation_criteria', v)} placeholder="Describe performance criteria required for probation confirmation..." rows={4} />
            <TextareaField label="Training Plan"         value={form.training_plan}         onChange={v => set('training_plan', v)}         placeholder="Outline the training schedule for the first 3 months..."      rows={3} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, border: '2px dashed #e2e8f0', borderRadius: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 24 }}>📄</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Upload JD Document & CV</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>PDF, DOCX up to 10MB each — Supabase Storage (Day 3)</div>
            </div>
            <BtnOutline>Browse Files</BtnOutline>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
            <BtnOutline onClick={() => setStep(1)}>← Back</BtnOutline>
            <BtnPrimary onClick={() => setStep(3)}>Next: CAPEX →</BtnPrimary>
          </div>
        </Card>
      )}

      {/* Step 3 — CAPEX */}
      {step === 3 && (
        <Card>
          <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: '#1e293b' }}>CAPEX Request</h2>
          <p style={{ margin: '0 0 20px', fontSize: 13.5, color: '#64748b' }}>Select equipment needed. Emails auto-sent to relevant department on submit.</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              { val: 'replacement_it', label: 'Replacement IT',  icon: '🔄', desc: 'Replace existing IT equipment', to: 'IT Manager' },
              { val: 'new_it',         label: 'New IT',          icon: '💻', desc: 'New equipment + manual doc required', to: 'IT Manager' },
              { val: 'furniture',      label: 'Furniture',       icon: '🪑', desc: 'Desk, chair, etc.', to: 'Admin Dept' },
              { val: 'other',          label: 'Other',           icon: '📦', desc: 'Any other CAPEX request', to: 'Admin Dept' },
            ].map(opt => (
              <div key={opt.val} onClick={() => set('capex_type', opt.val)} style={{
                border: `2px solid ${form.capex_type === opt.val ? '#6366f1' : '#e2e8f0'}`,
                background: form.capex_type === opt.val ? '#eef2ff' : '#fafafa',
                borderRadius: 10, padding: 14, cursor: 'pointer', transition: 'all 0.15s',
              }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{opt.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{opt.desc}</div>
                <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, marginTop: 6 }}>Auto-email → {opt.to}</div>
              </div>
            ))}
          </div>

          {form.capex_type.includes('it') && (
            <InfoBox>📧 Automated email → <strong>IT Manager</strong> on submission.</InfoBox>
          )}
          {!form.capex_type.includes('it') && (
            <InfoBox variant="warning">📧 Automated email → <strong>Admin Department</strong> on submission.</InfoBox>
          )}

          {form.capex_type.includes('it') && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                <input type="checkbox" checked={form.bc_user_creation_required} onChange={e => set('bc_user_creation_required', e.target.checked)} />
                BC (Business Central) user creation required with this CAPEX
              </label>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <FormField label="Description" value={form.capex_description} onChange={v => set('capex_description', v)} placeholder="Describe the CAPEX requirement..." />
            </div>
            <FormField label="Estimated Cost (LKR)" type="number" value={form.estimated_cost} onChange={v => set('estimated_cost', v)} placeholder="0.00" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 20, borderTop: '1px solid #f1f5f9', marginTop: 16 }}>
            <BtnOutline onClick={() => setStep(2)}>← Back</BtnOutline>
            <BtnPrimary onClick={() => setStep(4)}>Next: User Creation →</BtnPrimary>
          </div>
        </Card>
      )}

      {/* Step 4 — User Creation */}
      {step === 4 && (
        <Card>
          <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: '#1e293b' }}>User Account Creation</h2>
          <p style={{ margin: '0 0 20px', fontSize: 13.5, color: '#64748b' }}>Select accounts needed. Auto-request sent to IT on submission.</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              { key: 'm365_required',   label: 'Microsoft 365', icon: '📧', desc: 'Work email + Office apps' },
              { key: 'domain_required', label: 'Domain Account', icon: '🌐', desc: 'Windows domain login'    },
              { key: 'ess_required',    label: 'ESS Portal',     icon: '👤', desc: 'Employee self-service'   },
              { key: 'bc_required',     label: 'Business Central', icon: '📊', desc: 'ERP system access'    },
            ].map(acc => (
              <div key={acc.key} onClick={() => set(acc.key, !form[acc.key])} style={{
                border: `2px solid ${form[acc.key] ? '#10b981' : '#e2e8f0'}`,
                background: form[acc.key] ? '#f0fdf4' : '#fafafa',
                borderRadius: 10, padding: 14, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
              }}>
                <div style={{ fontSize: 16, marginBottom: 4 }}>{form[acc.key] ? '✅' : '⬜'}</div>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{acc.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{acc.label}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{acc.desc}</div>
              </div>
            ))}
          </div>

          <FormField label="Preferred Email" type="email" value={form.preferred_email} onChange={v => set('preferred_email', v)} placeholder={`${form.full_name.toLowerCase().replace(' ', '.')}@ai.lk`} />

          <InfoBox style={{ marginTop: 16 }}>
            📧 Auto-request sent to IT Manager on submission.
            {form.is_urgent && <><br /><strong style={{ color: '#ef4444' }}>🚨 URGENT: 24-hour SLA triggered.</strong></>}
          </InfoBox>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 20, borderTop: '1px solid #f1f5f9', marginTop: 8 }}>
            <BtnOutline onClick={() => setStep(3)}>← Back</BtnOutline>
            <BtnPrimary onClick={() => setStep(5)}>Review & Submit →</BtnPrimary>
          </div>
        </Card>
      )}

      {/* Step 5 — Review */}
      {step === 5 && (
        <Card>
          <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: '#1e293b' }}>Review & Submit</h2>
          <p style={{ margin: '0 0 20px', fontSize: 13.5, color: '#64748b' }}>Review all details before initiating the onboarding workflow.</p>

          {form.is_urgent && (
            <InfoBox variant="danger">
              🚨 <strong>URGENT ONBOARDING</strong> — Expedited 24-hour SLA will be triggered automatically.
            </InfoBox>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <ReviewSection title="Employee" rows={[
              ['Name', form.full_name], ['Role', form.designation], ['Dept', form.department],
              ['Join Date', form.date_of_joining ? new Date(form.date_of_joining).toDateString() : '—'],
            ]} />
            <ReviewSection title="JD & Criteria" rows={[
              ['Job Title', form.job_title],
              ['Criteria', form.confirmation_criteria ? 'Defined ✓' : 'Not set'],
              ['Training Plan', form.training_plan ? 'Provided ✓' : 'Not set'],
            ]} />
            <ReviewSection title="CAPEX" rows={[
              ['Type', form.capex_type.replace(/_/g, ' ').toUpperCase()],
              ['BC Required', form.bc_user_creation_required ? 'Yes' : 'No'],
              ['Est. Cost', form.estimated_cost ? `LKR ${form.estimated_cost}` : 'Not provided'],
            ]} />
            <ReviewSection title="Accounts" rows={[
              ['M365',   form.m365_required   ? '✅ Required' : '—'],
              ['Domain', form.domain_required ? '✅ Required' : '—'],
              ['ESS',    form.ess_required    ? '✅ Required' : '—'],
              ['BC',     form.bc_required     ? '✅ Required' : '—'],
            ]} />
          </div>

          {/* Email preview */}
          <div style={{ background: '#1e293b', color: '#e2e8f0', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Automated Emails on Submit</div>
            <div style={{ fontSize: 13, fontFamily: 'monospace', color: '#7dd3fc', lineHeight: 2 }}>
              → IT Manager: User creation ({[form.m365_required && 'M365', form.domain_required && 'Domain', form.ess_required && 'ESS', form.bc_required && 'BC'].filter(Boolean).join(', ')}){'\n'}
              {form.capex_type.includes('it')  && `→ IT Manager: CAPEX (${form.capex_type.replace(/_/g,' ')})${form.bc_user_creation_required ? ' + BC creation' : ''}\n`}
              {!form.capex_type.includes('it') && `→ Admin Dept: CAPEX (${form.capex_type.replace(/_/g,' ')})\n`}
              → System: Milestones auto-generated (7 checkpoints, 6 months){'\n'}
              → System: SLA created ({form.is_urgent ? '24hr URGENT' : '72hr standard'})
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
            <BtnOutline onClick={() => setStep(4)}>← Back</BtnOutline>
            <button onClick={handleSubmit} disabled={submitting} style={{
              padding: '12px 28px', borderRadius: 10, border: 'none',
              background: submitting ? '#e2e8f0' : 'linear-gradient(135deg, #059669, #10b981)',
              color: submitting ? '#94a3b8' : '#fff', fontWeight: 800, fontSize: 15, cursor: submitting ? 'not-allowed' : 'pointer',
            }}>
              {submitting ? '⟳ Submitting...' : '🚀 Initiate Onboarding'}
            </button>
          </div>
        </Card>
      )}
    </div>
  )
}

function ReviewSection({ title, rows }) {
  return (
    <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16 }}>
      <div style={{ fontWeight: 800, fontSize: 12, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{title}</div>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
          <span style={{ color: '#64748b', fontWeight: 500 }}>{k}</span>
          <span style={{ color: '#1e293b', fontWeight: 600 }}>{v || '—'}</span>
        </div>
      ))}
    </div>
  )
}