import { useApp } from '../context/AppContext.jsx'
import { useDashboardStats, useOnboardingCases, useSLATracking, useUserCreationRequests } from '../hooks/useData.js'
import { StatCard, Card, CardHeader, LoadingSpinner, StatusBadge, UrgentBadge, Avatar, BtnAction, fmtDate, daysSince } from '../components/shared/index.jsx'

export default function DashboardPage() {
  const { activeRole } = useApp()

  return (
    <div>
      {activeRole === 'hr_manager'    && <HRDashboard />}
      {activeRole === 'it_manager'    && <ITDashboard />}
      {activeRole === 'admin_officer' && <AdminDashboard />}
      {activeRole === 'supervisor'    && <SupervisorDashboard />}
      {activeRole === 'employee'      && <EmployeeDashboard />}
      {activeRole === 'trainer'       && <TrainerDashboard />}
    </div>
  )
}

// ─── HR Dashboard ────────────────────────────────────────────
function HRDashboard() {
  const { data: stats, loading: sLoading } = useDashboardStats()
  const { data: cases, loading: cLoading } = useOnboardingCases()

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Active Onboardings"    value={sLoading ? '…' : stats?.activeOnboardings}   trend="Initiated + In Progress"  color="#6366f1" />
        <StatCard label="Pending Validations"   value={sLoading ? '…' : stats?.pendingValidations}  trend="Employee info submitted"  color="#f59e0b" />
        <StatCard label="SLA Breaches"          value={sLoading ? '…' : stats?.slaBreaches}         trend="Needs immediate action"   color="#ef4444" />
        <StatCard label="Confirmed This Month"  value={sLoading ? '…' : stats?.confirmedThisMonth}  trend="Probation completed"      color="#10b981" />
      </div>

      <Card>
        <CardHeader title="Recent Onboardings" />
        {cLoading ? <LoadingSpinner /> : <OnboardingTable cases={cases ?? []} />}
      </Card>
    </>
  )
}

function OnboardingTable({ cases }) {
  if (!cases.length) return <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>No onboarding cases yet.</div>
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {['Employee', 'Role', 'Day', 'Status', 'Urgent', ''].map(h => (
            <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #f1f5f9', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {cases.slice(0, 8).map(c => (
          <tr key={c.id}>
            <td style={{ padding: '12px', borderBottom: '1px solid #f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={c.employee?.full_name} />
                <span style={{ fontWeight: 600, fontSize: 13.5, color: '#1e293b' }}>{c.employee?.full_name}</span>
              </div>
            </td>
            <td style={{ padding: '12px', fontSize: 13, color: '#475569', borderBottom: '1px solid #f8fafc' }}>{c.employee?.designation}</td>
            <td style={{ padding: '12px', fontSize: 13, color: '#475569', borderBottom: '1px solid #f8fafc' }}>Day {daysSince(c.employee?.date_of_joining) + 1}</td>
            <td style={{ padding: '12px', borderBottom: '1px solid #f8fafc' }}><StatusBadge status={c.status} /></td>
            <td style={{ padding: '12px', borderBottom: '1px solid #f8fafc' }}>{c.is_urgent ? <UrgentBadge /> : '—'}</td>
            <td style={{ padding: '12px', borderBottom: '1px solid #f8fafc' }}>
              <BtnAction onClick={() => {}}>View</BtnAction>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── IT Dashboard ────────────────────────────────────────────
function ITDashboard() {
  const { data: stats } = useDashboardStats()
  const { data: ucr, loading } = useUserCreationRequests()
  const { data: sla } = useSLATracking()

  const pending = ucr?.filter(r => r.m365_status === 'pending' || r.domain_status === 'pending') ?? []
  const breached = sla?.filter(s => s.status === 'breached') ?? []

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Pending User Creation" value={stats?.pendingUserCreation ?? '…'} trend="Awaiting IT action"      color="#0ea5e9" />
        <StatCard label="SLA Breaches"          value={stats?.slaBreaches ?? '…'}        trend="Needs escalation"         color="#ef4444" />
        <StatCard label="Pending CAPEX"         value={stats?.pendingCapex ?? '…'}        trend="IT equipment requests"    color="#f59e0b" />
      </div>

      {breached.length > 0 && (
        <Card style={{ borderLeft: '4px solid #ef4444', background: '#fef2f2' }}>
          <CardHeader title="🚨 Breached SLAs — Immediate Action Required" />
          {breached.map(s => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #fee2e2' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#dc2626' }}>{s.onboarding_case?.employee?.full_name} {s.onboarding_case?.is_urgent && <UrgentBadge />}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>{s.task_description}</div>
              </div>
              <BtnAction color="#dc2626" bg="#fee2e2">Escalate</BtnAction>
            </div>
          ))}
        </Card>
      )}

      <Card>
        <CardHeader title="Pending User Creation Tasks" />
        {loading ? <LoadingSpinner /> : pending.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>All caught up! ✅</div>
        ) : pending.map(r => (
          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f8fafc' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Avatar name={r.employee?.full_name} color="#0ea5e9" size={26} />
                {r.employee?.full_name}
                {r.onboarding_case?.is_urgent && <UrgentBadge />}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                {r.m365_required    && <AccountTag label="M365"   done={r.m365_status === 'completed'}   />}
                {r.domain_required  && <AccountTag label="Domain" done={r.domain_status === 'completed'} />}
                {r.ess_required     && <AccountTag label="ESS"    done={r.ess_status === 'completed'}    />}
                {r.bc_required      && <AccountTag label="BC"     done={r.bc_status === 'completed'}     />}
              </div>
            </div>
            <BtnAction>Mark Complete</BtnAction>
          </div>
        ))}
      </Card>
    </>
  )
}

function AccountTag({ label, done }) {
  return (
    <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: done ? '#dcfce7' : '#f1f5f9', color: done ? '#16a34a' : '#475569' }}>
      {done ? '✓ ' : ''}{label}
    </span>
  )
}

// ─── Admin Dashboard ─────────────────────────────────────────
function AdminDashboard() {
  const { data: stats } = useDashboardStats()
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Pending CAPEX Requests" value={stats?.pendingCapex ?? '…'} trend="Furniture & other" color="#f59e0b" />
      </div>
      <Card>
        <CardHeader title="Admin CAPEX Requests" />
        <p style={{ color: '#94a3b8', fontSize: 13 }}>Navigate to CAPEX Requests in the sidebar to manage furniture and other requests.</p>
      </Card>
    </>
  )
}

// ─── Supervisor Dashboard ────────────────────────────────────
function SupervisorDashboard() {
  const { data: cases, loading } = useOnboardingCases()
  const myTeam = cases ?? []

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Team on Probation"    value={myTeam.filter(c => c.employee?.status === 'on_probation').length} trend="Active cases"       color="#8b5cf6" />
        <StatCard label="Pending My Review"    value={myTeam.filter(c => c.status === 'in_progress').length}            trend="Milestones due"    color="#f59e0b" />
      </div>
      <Card>
        <CardHeader title="Team Probation Tracker" />
        {loading ? <LoadingSpinner /> : myTeam.map(c => (
          <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar name={c.employee?.full_name} color="#8b5cf6" />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.employee?.full_name}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Month {Math.ceil(daysSince(c.employee?.date_of_joining) / 30)} • {c.employee?.designation}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <StatusBadge status={c.employee?.status} />
              <BtnAction>Review</BtnAction>
            </div>
          </div>
        ))}
      </Card>
    </>
  )
}

// ─── Employee Dashboard ──────────────────────────────────────
function EmployeeDashboard() {
  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        borderRadius: 14, padding: '20px 24px', marginBottom: 20, color: '#fff',
      }}>
        <div style={{ fontSize: 40 }}>👋</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Welcome to Analytical Instruments!</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>Complete your onboarding tasks below. Your profile will be reviewed by HR.</div>
        </div>
      </div>
      <Card>
        <CardHeader title="My Onboarding Tasks" />
        <p style={{ color: '#94a3b8', fontSize: 13 }}>Navigate to My Onboarding in the sidebar to complete your tasks.</p>
      </Card>
    </>
  )
}

// ─── Trainer Dashboard ───────────────────────────────────────
function TrainerDashboard() {
  const { data: cases } = useOnboardingCases()
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Active Trainees" value={cases?.filter(c => c.status === 'in_progress').length ?? '…'} trend="In onboarding" color="#10b981" />
      </div>
      <Card>
        <CardHeader title="Training Overview" />
        <p style={{ color: '#94a3b8', fontSize: 13 }}>Training management module coming in Day 3.</p>
      </Card>
    </>
  )
}