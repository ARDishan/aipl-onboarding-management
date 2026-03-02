import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

// ─── Generic polling hook ────────────────────────────────────
function usePolling(fetchFn, interval = 30000) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    try {
      const result = await fetchFn()
      setData(result)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [fetchFn])

  useEffect(() => {
    load()
    const id = setInterval(load, interval)
    return () => clearInterval(id)
  }, [load, interval])

  return { data, loading, error, refetch: load }
}

// ─── Employees ───────────────────────────────────────────────
export function useEmployees() {
  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        supervisor:reporting_supervisor_id ( full_name ),
        created_by_profile:created_by ( full_name )
      `)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }, [])
  return usePolling(fetch)
}

// ─── Single employee (by profile_id — for employee role) ─────
export function useMyEmployee(profileId) {
  const fetch = useCallback(async () => {
    if (!profileId) return null
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('profile_id', profileId)
      .single()
    if (error) throw error
    return data
  }, [profileId])
  return usePolling(fetch)
}

// ─── Onboarding Cases ────────────────────────────────────────
export function useOnboardingCases() {
  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('onboarding_cases')
      .select(`
        *,
        employee:employee_id ( full_name, designation, department, status, date_of_joining ),
        initiator:initiated_by ( full_name )
      `)
      .order('initiated_at', { ascending: false })
    if (error) throw error
    return data
  }, [])
  return usePolling(fetch)
}

// ─── Dashboard stats ─────────────────────────────────────────
export function useDashboardStats() {
  const fetch = useCallback(async () => {
    const [
      { count: activeOnboardings },
      { count: pendingValidations },
      { count: slaBreaches },
      { count: confirmedThisMonth },
      { count: pendingUserCreation },
      { count: pendingCapex },
    ] = await Promise.all([
      supabase.from('onboarding_cases').select('*', { count: 'exact', head: true }).in('status', ['initiated','in_progress','pending_employee']),
      supabase.from('employees').select('*', { count: 'exact', head: true }).eq('info_submitted', true).is('info_validated_at', null),
      supabase.from('sla_tracking').select('*', { count: 'exact', head: true }).eq('status', 'breached'),
      supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'confirmed').gte('confirmed_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      supabase.from('user_creation_requests').select('*', { count: 'exact', head: true }).eq('m365_status', 'pending'),
      supabase.from('capex_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ])
    return { activeOnboardings, pendingValidations, slaBreaches, confirmedThisMonth, pendingUserCreation, pendingCapex }
  }, [])
  return usePolling(fetch)
}

// ─── SLA Tracking ────────────────────────────────────────────
export function useSLATracking() {
  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('sla_tracking')
      .select(`
        *,
        onboarding_case:onboarding_case_id (
          is_urgent,
          employee:employee_id ( full_name, designation )
        ),
        assignee:assigned_to ( full_name )
      `)
      .order('started_at', { ascending: false })
    if (error) throw error
    return data
  }, [])
  return usePolling(fetch)
}

// ─── CAPEX Requests ──────────────────────────────────────────
export function useCapexRequests(filter) {
  const fetch = useCallback(async () => {
    let query = supabase
      .from('capex_requests')
      .select(`
        *,
        employee:employee_id ( full_name, designation ),
        requester:requested_by ( full_name )
      `)
      .order('created_at', { ascending: false })

    if (filter === 'it')    query = query.in('capex_type', ['replacement_it', 'new_it'])
    if (filter === 'admin') query = query.in('capex_type', ['furniture', 'other'])

    const { data, error } = await query
    if (error) throw error
    return data
  }, [filter])
  return usePolling(fetch)
}

// ─── User Creation Requests ──────────────────────────────────
export function useUserCreationRequests() {
  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('user_creation_requests')
      .select(`
        *,
        employee:employee_id ( full_name, designation ),
        onboarding_case:onboarding_case_id ( is_urgent )
      `)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }, [])
  return usePolling(fetch)
}

// ─── Documents ───────────────────────────────────────────────
export function useDocuments(employeeId) {
  const fetch = useCallback(async () => {
    let query = supabase
      .from('onboarding_documents')
      .select(`*, employee:employee_id ( full_name )`)
      .order('created_at', { ascending: false })
    if (employeeId) query = query.eq('employee_id', employeeId)
    const { data, error } = await query
    if (error) throw error
    return data
  }, [employeeId])
  return usePolling(fetch)
}

// ─── Milestones ──────────────────────────────────────────────
export function useMilestones(employeeId) {
  const fetch = useCallback(async () => {
    let query = supabase
      .from('onboarding_milestones')
      .select(`
        *,
        employee:employee_id ( full_name ),
        reviewer:reviewed_by ( full_name )
      `)
      .order('due_date', { ascending: true })
    if (employeeId) query = query.eq('employee_id', employeeId)
    const { data, error } = await query
    if (error) throw error
    return data
  }, [employeeId])
  return usePolling(fetch)
}

// ─── HRIS Sync Log ───────────────────────────────────────────
export function useHRISSyncLog() {
  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('hris_sync_log')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10)
    if (error) throw error
    return data
  }, [])
  return usePolling(fetch)
}

// ─── Mobile Allowance Requests ───────────────────────────────
export function useMobileAllowance(employeeId) {
  const fetch = useCallback(async () => {
    let query = supabase
      .from('mobile_allowance_requests')
      .select(`*, employee:employee_id ( full_name )`)
      .order('submitted_at', { ascending: false })
    if (employeeId) query = query.eq('employee_id', employeeId)
    const { data, error } = await query
    if (error) throw error
    return data
  }, [employeeId])
  return usePolling(fetch)
}