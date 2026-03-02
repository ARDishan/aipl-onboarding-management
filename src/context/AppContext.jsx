import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

const AppContext = createContext(null)
export const useApp = () => useContext(AppContext)

export const ROLES = {
  hr_manager:    { label: 'HR Manager',     color: '#6366f1', bg: '#eef2ff', icon: '👤', nav: ['dashboard','initiate','employees','capex','documents','sla','hris'] },
  it_manager:    { label: 'IT Manager',     color: '#0ea5e9', bg: '#e0f2fe', icon: '💻', nav: ['dashboard','user_creation','capex','sla'] },
  admin_officer: { label: 'Admin Officer',  color: '#f59e0b', bg: '#fffbeb', icon: '🗂️', nav: ['dashboard','capex'] },
  trainer:       { label: 'Trainer',        color: '#10b981', bg: '#ecfdf5', icon: '🎓', nav: ['dashboard','training'] },
  supervisor:    { label: 'Supervisor',     color: '#8b5cf6', bg: '#f5f3ff', icon: '📋', nav: ['dashboard','milestones','evaluations'] },
  employee:      { label: 'New Employee',   color: '#ec4899', bg: '#fdf2f8', icon: '🙋', nav: ['dashboard','my_onboarding','documents','mobile_allowance'] },
}

export const NAV_LABELS = {
  dashboard: 'Dashboard', initiate: 'Initiate Onboarding', employees: 'Employees',
  capex: 'CAPEX Requests', documents: 'Documents', sla: 'SLA Monitor',
  hris: 'HRIS Sync', user_creation: 'User Creation', training: 'Training Plans',
  milestones: 'Milestones', evaluations: 'Evaluations', my_onboarding: 'My Onboarding',
  mobile_allowance: 'Mobile Allowance',
}

export function AppProvider({ children }) {
  const [activeRole, setActiveRole]   = useState('hr_manager')
  const [activePage, setActivePage]   = useState('dashboard')
  const [notifications, setNotifications] = useState([])
  const [toast, setToast]             = useState(null)
  const [authUser, setAuthUser]       = useState(null)

  // Auth: sign in once on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setAuthUser(data.session.user)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // Fetch notifications for current session (polling 30s)
  const fetchNotifications = useCallback(async () => {
    if (!authUser) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', authUser.id)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setNotifications(data)
  }, [authUser])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const markNotifRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id)
  }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const switchRole = (role) => {
    setActiveRole(role)
    setActivePage('dashboard')
  }

  return (
    <AppContext.Provider value={{
      activeRole, activePage, setActivePage,
      notifications, markNotifRead, fetchNotifications,
      toast, showToast,
      authUser, setAuthUser,
      switchRole,
    }}>
      {children}
    </AppContext.Provider>
  )
}