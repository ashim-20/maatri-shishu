import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function count(supabase: Awaited<ReturnType<typeof createClient>>, table: string, filter?: (query: any) => any) {
  let query = supabase.from(table).select('id', { count: 'exact', head: true })
  if (filter) query = filter(query)
  const result = await query
  return result.error ? 0 : result.count || 0
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [mothers, children, vaccinations, anc, pnc, followUp, upcoming, syncPending, sessions] = await Promise.all([
    count(supabase, 'mothers'), count(supabase, 'children'), count(supabase, 'vaccination_events'),
    count(supabase, 'anc_events'), count(supabase, 'pnc_events'),
    count(supabase, 'follow_up_tasks', (query) => query.eq('status', 'open')),
    count(supabase, 'appointments', (query) => query.eq('status', 'scheduled').gte('starts_at', new Date().toISOString())),
    count(supabase, 'sync_operations', (query) => query.in('status', ['pending', 'failed', 'conflict'])),
    count(supabase, 'service_sessions', (query) => query.gte('session_date', new Date().toISOString().slice(0, 10)).neq('status', 'closed')),
  ])

  const [tasksResult, sessionsResult, auditResult] = await Promise.all([
    supabase.from('follow_up_tasks').select('id, task_type, due_date, status, priority, mother_id, child_id').eq('status', 'open').order('due_date', { ascending: true }).limit(6),
    supabase.from('service_sessions').select('id, clinic_name, session_date, session_type, location, capacity, status').gte('session_date', new Date().toISOString().slice(0, 10)).neq('status', 'closed').order('session_date', { ascending: true }).limit(4),
    supabase.from('audit_events').select('id, action, entity_type, occurred_at, metadata').order('occurred_at', { ascending: false }).limit(8),
  ])

  return NextResponse.json({ data: { metrics: { mothers, children, vaccinations, anc, pnc, followUp, upcoming, syncPending, sessions }, tasks: tasksResult.data || [], sessions: sessionsResult.data || [], audit: auditResult.data || [] } })
}
