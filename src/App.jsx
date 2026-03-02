import { useEffect, useState } from 'react'
import { AppProvider, useApp, NAV_LABELS } from './context/AppContext'
import { Layout } from './components/layout/index.jsx'
import { supabase } from './lib/supabase'

// Pages
import LoginPage           from './pages/LoginPage'
import DashboardPage       from './pages/DashboardPage'
import InitiateOnboardingPage from './pages/InitiateOnboardingPage'
import SLAMonitorPage      from './pages/SLAMonitorPage'
import { CapexPage, UserCreationPage, HRISSyncPage, EmployeeOnboardingPage, DocumentsPage, MilestonesPage } from './pages/OtherPages'
import { ComingSoon }      from './components/shared'

// ─── Auth Gate ───────────────────────────────────────────────
function AuthGate() {
  const { authUser, setAuthUser } = useApp()
  const [checking, setChecking]   = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setAuthUser(data.session.user)
      setChecking(false)
    })
  }, [])

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>⟳ Loading...</div>
      </div>
    )
  }

  if (!authUser) return <LoginPage onLogin={setAuthUser} />
  return <AppShell />
}

// ─── App Shell (authenticated) ───────────────────────────────
function AppShell() {
  const { activePage, activeRole } = useApp()

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':      return <DashboardPage />
      case 'initiate':       return <InitiateOnboardingPage />
      case 'sla':            return <SLAMonitorPage />
      case 'capex':          return <CapexPage />
      case 'capex_it':       return <CapexPage filterType="it" />
      case 'capex_admin':    return <CapexPage filterType="admin" />
      case 'user_creation':  return <UserCreationPage />
      case 'hris':           return <HRISSyncPage />
      case 'my_onboarding':  return <EmployeeOnboardingPage />
      case 'documents':      return <DocumentsPage />
      case 'milestones':     return <MilestonesPage />
      default:               return <ComingSoon page={NAV_LABELS[activePage] ?? activePage} />
    }
  }

  return (
    <Layout>
      {renderPage()}
    </Layout>
  )
}

// ─── Root ────────────────────────────────────────────────────
export default function App() {
  return (
    <AppProvider>
      <AuthGate />
    </AppProvider>
  )
}