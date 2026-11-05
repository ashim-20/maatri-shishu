import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const tables = {
  mothers: 'mothers',
  children: 'children',
  vaccinations: 'vaccination_events',
  'anc-pnc': 'anc_events',
  followup: 'follow_up_tasks',
  sessions: 'service_sessions',
} as const

type Entity = keyof typeof tables

async function activeStaff() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null }
  return { supabase, user }
}

function getTable(entity: string) {
  return entity in tables ? tables[entity as Entity] : null
}

export async function GET(_request: Request, context: { params: Promise<{ entity: string }> }) {
  const { entity } = await context.params
  const table = getTable(entity)
  if (!table) return NextResponse.json({ error: 'Unknown feature.' }, { status: 404 })
  const { supabase, user } = await activeStaff()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const { data, error } = await supabase.from(table).select('id, created_at, updated_at').order('created_at', { ascending: false }).limit(100)
  if (error) return NextResponse.json({ error: 'Unable to load records.' }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: Request, context: { params: Promise<{ entity: string }> }) {
  const { entity } = await context.params
  const table = getTable(entity)
  if (!table) return NextResponse.json({ error: 'Unknown feature.' }, { status: 404 })
  const { supabase, user } = await activeStaff()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'A record object is required.' }, { status: 400 })
  const { id: _id, created_at: _created, updated_at: _updated, ...payload } = body as Record<string, unknown>
  const { data, error } = await supabase.from(table).insert(payload).select('id, created_at, updated_at').single()
  if (error) return NextResponse.json({ error: 'Unable to create the record.' }, { status: 400 })
  await supabase.from('audit_events').insert({ actor_id: user.id, action: 'create', entity_type: table, entity_id: data.id, metadata: { source: 'web' } })
  return NextResponse.json({ data }, { status: 201 })
}

export async function PATCH(request: Request, context: { params: Promise<{ entity: string }> }) {
  const { entity } = await context.params
  const table = getTable(entity)
  if (!table) return NextResponse.json({ error: 'Unknown feature.' }, { status: 404 })
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Record id is required.' }, { status: 400 })
  const { supabase, user } = await activeStaff()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const body = await request.json().catch(() => null)
  const allowed = entity === 'followup' ? ['status', 'priority', 'due_date', 'task_type'] : entity === 'sessions' ? ['status', 'location', 'capacity', 'session_date', 'session_type', 'clinic_name'] : []
  const update = Object.fromEntries(Object.entries(body || {}).filter(([key, value]) => allowed.includes(key) && value !== undefined))
  if (!Object.keys(update).length) return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 })
  const { data, error } = await supabase.from(table).update(update).eq('id', id).select('id, created_at, updated_at').single()
  if (error) return NextResponse.json({ error: 'Unable to update the record.' }, { status: 400 })
  await supabase.from('audit_events').insert({ actor_id: user.id, action: 'update', entity_type: table, entity_id: id, metadata: { source: 'web', fields: Object.keys(update) } })
  return NextResponse.json({ data })
}

export async function DELETE(request: Request, context: { params: Promise<{ entity: string }> }) {
  const { entity } = await context.params
  const table = getTable(entity)
  if (!table) return NextResponse.json({ error: 'Unknown feature.' }, { status: 404 })
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Record id is required.' }, { status: 400 })
  const { supabase, user } = await activeStaff()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Unable to delete the record.' }, { status: 400 })
  await supabase.from('audit_events').insert({ actor_id: user.id, action: 'delete', entity_type: table, entity_id: id, metadata: { source: 'web' } })
  return NextResponse.json({ ok: true })
}
