import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, staff: null }
  const { data: staff } = await supabase.from('staff_users').select('id, role, status').eq('id', user.id).maybeSingle()
  if (!staff || staff.status !== 'active' || staff.role !== 'admin') return { supabase, user: null, staff: null }
  return { supabase, user, staff }
}

export async function GET() {
  const { supabase, user } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Administrator approval required.' }, { status: 403 })
  const { data, error } = await supabase.from('staff_users').select('id, display_name, role, status, clinic_id, created_at').order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: 'Unable to load staff queue.' }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PATCH(request: Request) {
  const { supabase, user } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Administrator approval required.' }, { status: 403 })
  const id = new URL(request.url).searchParams.get('id')
  const body = await request.json().catch(() => null)
  if (!id || !['active', 'suspended', 'pending'].includes(body?.status)) return NextResponse.json({ error: 'Staff id and valid status are required.' }, { status: 400 })
  const { data, error } = await supabase.from('staff_users').update({ status: body.status }).eq('id', id).select('id, display_name, role, status').single()
  if (error) return NextResponse.json({ error: 'Unable to update staff approval.' }, { status: 400 })
  await supabase.from('audit_events').insert({ actor_id: user.id, action: 'staff_status_change', entity_type: 'staff_user', entity_id: id, metadata: { status: body.status } })
  return NextResponse.json({ data })
}
