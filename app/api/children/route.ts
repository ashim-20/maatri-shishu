import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const childFields = 'id, mother_id, full_name, date_of_birth, sex, birth_weight_kg, consent_status, created_at, updated_at'

async function authorizedClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, staff: null }
  const { data: staff } = await supabase.from('staff_users').select('id, role, status').eq('id', user.id).maybeSingle()
  return { supabase, user: staff?.status === 'active' ? user : null, staff }
}

export async function GET(request: Request) {
  const { supabase, user, staff } = await authorizedClient()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const query = new URL(request.url).searchParams.get('q')?.trim() || ''
  let builder = supabase.from('children').select(childFields).order('updated_at', { ascending: false }).limit(100)
  if (staff?.role !== 'admin') {
    const { data: assignedMothers } = await supabase.from('mothers').select('id').eq('assigned_staff_id', user.id)
    const motherIds = (assignedMothers || []).map((mother) => mother.id)
    builder = motherIds.length ? builder.in('mother_id', motherIds) : builder.eq('mother_id', '00000000-0000-0000-0000-000000000000')
  }
  if (query) builder = builder.ilike('full_name', `%${query.replaceAll('%', '')}%`)
  const { data, error } = await builder
  if (error) return NextResponse.json({ error: 'Unable to load authorized records.' }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PATCH(request: Request) {
  const { supabase, user, staff } = await authorizedClient()
  const id = new URL(request.url).searchParams.get('id')
  if (user && staff?.role !== 'admin' && id) {
    const { data: child } = await supabase.from('children').select('mother_id').eq('id', id).maybeSingle()
    const { count } = child?.mother_id ? await supabase.from('mothers').select('id', { count: 'exact', head: true }).eq('id', child.mother_id).eq('assigned_staff_id', user.id) : { count: 0 }
    if (!count) return NextResponse.json({ error: 'This record is outside your authorized catchment.' }, { status: 403 })
  }
  if (!user || !id) return NextResponse.json({ error: 'Authorized user and record id are required.' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const update: Record<string, unknown> = {}
  if (typeof body?.full_name === 'string' && body.full_name.trim().length <= 120) update.full_name = body.full_name.trim()
  if (typeof body?.date_of_birth === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(body.date_of_birth)) update.date_of_birth = body.date_of_birth
  if (['female', 'male', 'other'].includes(body?.sex)) update.sex = body.sex
  if (typeof body?.mother_id === 'string') update.mother_id = body.mother_id || null
  if (['pending', 'granted', 'declined'].includes(body?.consent_status)) update.consent_status = body.consent_status
  if (!Object.keys(update).length) return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 })
  const { data, error } = await supabase.from('children').update(update).eq('id', id).select(childFields).single()
  if (error) return NextResponse.json({ error: 'Unable to update this record.' }, { status: 400 })
  await supabase.from('audit_events').insert({ actor_id: user.id, action: 'update', entity_type: 'child', entity_id: id, metadata: { source: 'web', fields: Object.keys(update) } })
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const { supabase, user, staff } = await authorizedClient()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (staff?.role !== 'admin' && body?.mother_id) {
    const { count } = await supabase.from('mothers').select('id', { count: 'exact', head: true }).eq('id', body.mother_id).eq('assigned_staff_id', user.id)
    if (!count) return NextResponse.json({ error: 'The selected mother is outside your authorized catchment.' }, { status: 403 })
  }
  const fullName = typeof body?.full_name === 'string' ? body.full_name.trim() : ''
  const dob = typeof body?.date_of_birth === 'string' ? body.date_of_birth : ''
  if (!fullName || fullName.length > 120 || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return NextResponse.json({ error: 'Name and a valid date of birth are required.' }, { status: 400 })
  const row = { mother_id: typeof body.mother_id === 'string' ? body.mother_id : null, full_name: fullName, date_of_birth: dob, sex: ['female', 'male', 'other'].includes(body.sex) ? body.sex : null, birth_weight_kg: Number.isFinite(Number(body.birth_weight_kg)) ? Number(body.birth_weight_kg) : null, consent_status: body.consent_status === 'granted' ? 'granted' : 'pending' }
  const { data, error } = await supabase.from('children').insert(row).select(childFields).single()
  if (error) return NextResponse.json({ error: 'Unable to save this record.' }, { status: 500 })
  await supabase.from('audit_events').insert({ actor_id: user.id, action: 'create', entity_type: 'child', entity_id: data.id, metadata: { source: 'web' } })
  return NextResponse.json({ data }, { status: 201 })
}
