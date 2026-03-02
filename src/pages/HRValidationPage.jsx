import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { Card, CardHeader, LoadingSpinner, EmptyState, BtnPrimary, BtnOutline, BtnAction, Avatar, StatusBadge, fmtDateTime } from '../components/shared'

// ─── Hook: fetch employees pending HR validation ─────────────
function usePendingValidation() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  const fetch = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('info_submitted', true)
      .is('info_validated_at', null)
      .order('updated_at', { ascending: false })
    if (!error) setData(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])
  return { data, loading, refetch: fetch }
}

// ─── Main HR Validation Page ─────────────────────────────────
export default function HRValidationPage() {
  const { data: pending, loading, refetch } = usePendingValidation()
  const [selected, setSelected] = useState(null)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1.4fr' : '1fr', gap: 20 }}>
      {/* Left — Pending List */}
      <Card>
        <CardHeader title="Pending Validations" />
        {loading
          ? <LoadingSpinner />
          : !pending?.length
            ? <EmptyState icon="✅" title="All caught up!" subtitle="No employee info pending validation." />
            : pending.map(emp => (
              <div
                key={emp.id}
                onClick={() => setSelected(emp)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 12px', borderRadius: 10, cursor: 'pointer', marginBottom: 6,
                  background: selected?.id === emp.id ? '#eef2ff' : '#f8fafc',
                  border: `1.5px solid ${selected?.id === emp.id ? '#6366f1' : 'transparent'}`,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar name={emp.full_name} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{emp.full_name}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{emp.designation} · {emp.department}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Submitted {fmtDateTime(emp.updated_at)}</div>
                  </div>
                </div>
                <BtnAction>Review →</BtnAction>
              </div>
            ))
        }
      </Card>

      {/* Right — Validation Form */}
      {selected && (
        <ValidationForm
          employee={selected}
          onClose={() => setSelected(null)}
          onDone={() => { setSelected(null); refetch() }}
        />
      )}
    </div>
  )
}

// ─── Validation Form with diff view ─────────────────────────
function ValidationForm({ employee, onClose, onDone }) {
  const { showToast, authUser } = useApp()
  const [submitting, setSubmitting] = useState(false)

  // Editable fields — pre-filled with employee's submitted values
  const [fields, setFields] = useState({
    full_name:               employee.full_name               ?? '',
    nic_number:              employee.nic_number              ?? '',
    date_of_birth:           employee.date_of_birth           ?? '',
    gender:                  employee.gender                  ?? '',
    marital_status:          employee.marital_status          ?? '',
    address:                 employee.address                 ?? '',
    personal_email:          employee.personal_email          ?? '',
    personal_phone:          employee.personal_phone          ?? '',
    emergency_contact_name:  employee.emergency_contact_name  ?? '',
    emergency_contact_phone: employee.emergency_contact_phone ?? '',
  })

  // Track which fields HR has changed
  const changedFields = Object.keys(fields).filter(
    key => fields[key] !== (employee[key] ?? '')
  )
  const hasChanges = changedFields.length > 0

  const set = (field, val) => setFields(p => ({ ...p, [field]: val }))

  const handlePost = async (withCorrections) => {
    setSubmitting(true)
    try {
      const { data: profile } = await supabase
        .from('profiles').select('id').eq('id', authUser.id).single()

      // Build update payload
      const update = {
        ...fields,
        info_validated_by:    profile.id,
        info_validated_at:    new Date().toISOString(),
        info_had_corrections: withCorrections,
        corrected_fields:     withCorrections ? changedFields : null,
      }

      await supabase.from('employees').update(update).eq('id', employee.id)

      // Notify the employee
      if (employee.profile_id) {
        const notifMessage = withCorrections
          ? `Your information has been corrected and successfully posted. Fields updated: ${changedFields.map(f => f.replace(/_/g, ' ')).join(', ')}.`
          : 'Your information has been successfully posted.'

        await supabase.from('notifications').insert({
          recipient_id: employee.profile_id,
          type:         withCorrections ? 'info_corrected' : 'info_posted',
          title:        withCorrections ? '📝 Your Info Was Corrected & Posted' : '✅ Your Info Was Successfully Posted',
          message:      notifMessage,
          employee_id:  employee.id,
          corrected_fields: withCorrections ? changedFields : null,
        })
      }

      showToast(withCorrections
        ? `Info corrected and posted for ${employee.full_name}`
        : `Info approved and posted for ${employee.full_name}`
      )
      onDone()
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const FIELD_LABELS = {
    full_name:               'Full Name',
    nic_number:              'NIC Number',
    date_of_birth:           'Date of Birth',
    gender:                  'Gender',
    marital_status:          'Marital Status',
    address:                 'Address',
    personal_email:          'Personal Email',
    personal_phone:          'Personal Phone',
    emergency_contact_name:  'Emergency Contact Name',
    emergency_contact_phone: 'Emergency Contact Phone',
  }

  return (
    <Card>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: '#1e293b' }}>
            Validate: {employee.full_name}
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
            Review and correct if needed, then post.
          </p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
      </div>

      {/* Change indicator */}
      {hasChanges && (
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#c2410c' }}>
          ✏️ You have modified <strong>{changedFields.length}</strong> field{changedFields.length > 1 ? 's' : ''}:
          {' '}<strong>{changedFields.map(f => FIELD_LABELS[f]).join(', ')}</strong>.
          Posting will notify the employee of these corrections.
        </div>
      )}

      {/* Fields with diff highlight */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20, maxHeight: 480, overflowY: 'auto', paddingRight: 4 }}>
        {Object.entries(FIELD_LABELS).map(([key, label]) => {
          const changed  = changedFields.includes(key)
          const original = employee[key] ?? ''
          return (
            <div key={key}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: changed ? '#c2410c' : '#475569', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {label} {changed && <span style={{ color: '#f59e0b' }}>● Modified</span>}
              </label>

              {/* Show original value if changed */}
              {changed && (
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ textDecoration: 'line-through', color: '#ef4444' }}>{original || '(empty)'}</span>
                  <span>→</span>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>{fields[key]}</span>
                </div>
              )}

              <input
                type={key === 'date_of_birth' ? 'date' : key.includes('email') ? 'email' : 'text'}
                value={fields[key]}
                onChange={e => set(key, e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px', boxSizing: 'border-box',
                  border: `1.5px solid ${changed ? '#f59e0b' : '#e2e8f0'}`,
                  borderRadius: 8, fontSize: 13.5, color: '#1e293b',
                  background: changed ? '#fffbeb' : '#fafafa',
                  outline: 'none', fontFamily: 'inherit',
                }}
              />
            </div>
          )
        })}
      </div>

      {/* SRS Addition #1 — two distinct post flows */}
      <div style={{ display: 'flex', gap: 10, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
        <BtnOutline onClick={onClose} disabled={submitting}>Cancel</BtnOutline>
        <div style={{ flex: 1 }} />
        {hasChanges ? (
          <button
            onClick={() => handlePost(true)}
            disabled={submitting}
            style={{
              padding: '10px 20px', borderRadius: 8, border: 'none',
              background: submitting ? '#e2e8f0' : 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: submitting ? '#94a3b8' : '#fff',
              fontWeight: 700, fontSize: 14, cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            ✏️ Post with Corrections
          </button>
        ) : (
          <BtnPrimary onClick={() => handlePost(false)} disabled={submitting}>
            ✅ Approve & Post
          </BtnPrimary>
        )}
      </div>

      {/* Explains SRS requirement clearly */}
      <div style={{ marginTop: 12, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
        {hasChanges
          ? 'Employee will be notified: "Your information has been corrected and successfully posted."'
          : 'Employee will be notified: "Your information has been successfully posted."'
        }
      </div>
    </Card>
  )
}