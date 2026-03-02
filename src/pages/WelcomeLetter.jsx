import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'

// ─── Hook: detects first login and triggers welcome letter ───
export function useWelcomeLetter(employee) {
  const [showModal, setShowModal] = useState(false)
  const { showToast } = useApp()

  useEffect(() => {
    if (!employee) return
    // Show modal if welcome letter hasn't been sent yet
    if (!employee.welcome_letter_sent && employee.profile_id) {
      setShowModal(true)
      triggerWelcomeLetter(employee, showToast)
    }
  }, [employee])

  return { showModal, setShowModal }
}

async function triggerWelcomeLetter(employee, showToast) {
  try {
    // Mark as sent in DB first
    await supabase
      .from('employees')
      .update({
        welcome_letter_sent: true,
        first_login_at: new Date().toISOString(),
      })
      .eq('id', employee.id)

    // Call Edge Function to send email
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-welcome-letter`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        employee_name:   employee.full_name,
        employee_email:  employee.personal_email,
        designation:     employee.designation,
        department:      employee.department,
        date_of_joining: employee.date_of_joining,
      }),
    })

    showToast('GMD Welcome Letter sent to your email!')
  } catch (e) {
    console.error('Welcome letter error:', e)
  }
}

// ─── Welcome Letter Modal Component ─────────────────────────
export function WelcomeLetterModal({ employee, onClose }) {
  const joinDate = employee?.date_of_joining
    ? new Date(employee.date_of_joining).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : '—'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 620,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
        animation: 'slideUp 0.3s ease',
      }}>
        <style>{`@keyframes slideUp { from { transform: translateY(30px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          padding: '32px 40px', borderRadius: '20px 20px 0 0',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <div style={{ color: '#fff', fontSize: 24, fontWeight: 900, marginBottom: 4 }}>
            Welcome to Analytical Instruments!
          </div>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
            General Manager's Welcome Letter
          </div>
        </div>

        {/* Letter Body */}
        <div style={{ padding: '36px 40px' }}>
          <p style={{ fontSize: 16, color: '#475569', lineHeight: 1.8, marginBottom: 20 }}>
            Dear <strong style={{ color: '#1e293b' }}>{employee?.full_name}</strong>,
          </p>
          <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.8, marginBottom: 16 }}>
            On behalf of the entire team at <strong>Analytical Instruments (Pvt) Ltd</strong>,
            it is my great pleasure to welcome you as our newest team member. Your talent, skills,
            and fresh perspective will be invaluable assets to our growing organization.
          </p>
          <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.8, marginBottom: 24 }}>
            We are confident that you will find your work here both challenging and rewarding,
            and we look forward to supporting your professional growth every step of the way.
          </p>

          {/* Employee Details Box */}
          <div style={{
            background: 'linear-gradient(135deg, #eef2ff, #f5f3ff)',
            border: '1px solid #c7d2fe', borderRadius: 12, padding: '20px 24px', marginBottom: 24,
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
              Your Details
            </div>
            {[
              ['Full Name',     employee?.full_name],
              ['Designation',   employee?.designation],
              ['Department',    employee?.department],
              ['Date of Joining', joinDate],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e0e7ff', fontSize: 14 }}>
                <span style={{ color: '#6366f1', fontWeight: 600 }}>{label}</span>
                <span style={{ color: '#1e293b', fontWeight: 700 }}>{value}</span>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.8, marginBottom: 8 }}>
            Please complete your onboarding tasks in the portal, review all mandatory documents,
            and do not hesitate to reach out to your HR team if you need any assistance.
          </p>
          <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.8, marginBottom: 32 }}>
            Once again, a very warm welcome. We are excited to have you on board!
          </p>

          {/* Signature */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 20, marginBottom: 32 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#1e293b' }}>General Manager — Director</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Analytical Instruments (Pvt) Ltd</div>
          </div>

          {/* Email notice */}
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 24, fontSize: 13, color: '#15803d' }}>
            ✅ A copy of this welcome letter has been sent to your personal email address.
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              onClick={() => window.print()}
              style={{ padding: '10px 20px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
            >
              🖨️ Print
            </button>
            <button
              onClick={onClose}
              style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
            >
              Continue to Onboarding →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}