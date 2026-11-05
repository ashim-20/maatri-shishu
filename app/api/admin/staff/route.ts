import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null }
  const { data: staff } = await supabase.from('staff_users').select('id, role, status').eq('id', user.id).maybeSingle()
  if (!staff || staff.status !== 'active' || staff.role !== 'admin') return { supabase, user: null }
  return { supabase, user }
}

export async function GET() {
  const { supabase, user } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Administrator approval required.' }, { status: 403 })
  const { data: staff, error } = await supabase.from('staff_users').select('id, display_name, role, status, clinic_name, created_at').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'Unable to load staff records.' }, { status: 500 })
  const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (authError) return NextResponse.json({ error: 'Unable to load staff email addresses.' }, { status: 500 })
  const emails = new Map(authUsers.users.map((authUser) => [authUser.id, authUser.email || '']))
  const staffIds = (staff || []).map((member) => member.id)
  const { data: scopes } = staffIds.length ? await supabase.from('staff_scopes').select('staff_id, scope_type, scope_value').in('staff_id', staffIds) : { data: [] }
  const scopeMap = new Map<string, string[]>()
  for (const scope of scopes || []) scopeMap.set(scope.staff_id, [...(scopeMap.get(scope.staff_id) || []), `${scope.scope_type}: ${scope.scope_value}`])
  return NextResponse.json({ data: (staff || []).map((member) => ({ ...member, email: emails.get(member.id) || '—', assigned_facility: member.clinic_name || 'Unassigned', catchment: scopeMap.get(member.id)?.join(', ') || 'Unassigned' })) })
}

export async function PATCH(request: Request) {
  const { supabase, user } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Administrator approval required.' }, { status: 403 })
  const id = new URL(request.url).searchParams.get('id')
  const body = await request.json().catch(() => null)
  if (!id || !['active', 'rejected', 'pending'].includes(body?.status)) return NextResponse.json({ error: 'Staff id and valid status are required.' }, { status: 400 })
  const { data, error } = await supabase.from('staff_users').update({ status: body.status }).eq('id', id).select('id, display_name, role, status').single()
  if (error) return NextResponse.json({ error: 'Unable to update staff approval.' }, { status: 400 })
  await supabase.from('audit_events').insert({ actor_id: user.id, action: body.status === 'active' ? 'staff_approved' : 'staff_rejected', entity_type: 'staff_user', entity_id: id, metadata: { status: body.status } })
  return NextResponse.json({ data })
}
