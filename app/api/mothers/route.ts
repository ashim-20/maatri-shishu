import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: staff } = await supabase.from('staff_users').select('id, status').eq('id', user.id).maybeSingle()
  if (staff?.status !== 'active') return NextResponse.json({ error: 'Staff approval required.' }, { status: 403 })
  const query = new URL(request.url).searchParams.get('q')?.trim() || ''
  let requestQuery = supabase.from('mothers').select('id, external_ref, full_name, phone, ward, blood_group, consent_status, assigned_staff_id, created_at, updated_at').order('updated_at', { ascending: false }).limit(100)
  if (query) requestQuery = requestQuery.ilike('full_name', `%${query.replaceAll('%', '')}%`)
  const { data, error } = await requestQuery
  if (error) return NextResponse.json({ error: 'Unable to load authorized records.' }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const id = new URL(request.url).searchParams.get('id')
  if (!user || !id) return NextResponse.json({ error: 'Authorized user and record id are required.' }, { status: 401 })
  const { data: staff } = await supabase.from('staff_users').select('id, status').eq('id', user.id).maybeSingle()
  if (staff?.status !== 'active') return NextResponse.json({ error: 'Staff approval required.' }, { status: 403 })
  const body = await request.json().catch(() => null)
  const update: Record<string, unknown> = {}
  if (typeof body?.full_name === 'string' && body.full_name.trim().length <= 120) update.full_name = body.full_name.trim()
  if (typeof body?.ward === 'string') update.ward = body.ward.trim() || null
  if (typeof body?.phone === 'string') update.phone = body.phone.trim() || null
  if (['pending', 'granted', 'declined'].includes(body?.consent_status)) update.consent_status = body.consent_status
  if (!Object.keys(update).length) return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 })
  const { data, error } = await supabase.from('mothers').update(update).eq('id', id).select('id, external_ref, full_name, phone, ward, blood_group, consent_status, assigned_staff_id, created_at, updated_at').single()
  if (error) return NextResponse.json({ error: 'Unable to update this record.' }, { status: 400 })
  await supabase.from('audit_events').insert({ actor_id: user.id, action: 'update', entity_type: 'mother', entity_id: id, metadata: { source: 'web', fields: Object.keys(update) } })
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : ''
  if (!fullName || fullName.length > 120) return NextResponse.json({ error: 'A valid name is required.' }, { status: 400 })
  const { data: staff } = await supabase.from('staff_users').select('id, status').eq('id', user.id).maybeSingle()
  if (staff?.status !== 'active') return NextResponse.json({ error: 'Staff approval required.' }, { status: 403 })
  const { data, error } = await supabase.from('mothers').insert({ full_name: fullName, ward: body.ward || null, phone: body.phone || null, consent_status: body.consent_status === 'granted' ? 'granted' : 'pending', assigned_staff_id: user.id }).select('id, full_name, ward, phone, consent_status').single()
  if (error) return NextResponse.json({ error: 'Unable to save this record.' }, { status: 500 })
  await supabase.from('audit_events').insert({ actor_id: user.id, action: 'create', entity_type: 'mother', entity_id: data.id, metadata: { source: 'web' } })
  return NextResponse.json({ data }, { status: 201 })
}
