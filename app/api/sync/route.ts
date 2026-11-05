import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: staff } = await supabase.from('staff_users').select('status').eq('id', user.id).maybeSingle()
  if (staff?.status !== 'active') return NextResponse.json({ error: 'Staff approval required.' }, { status: 403 })
  const { data, error } = await supabase.from('sync_operations').select('operation_key, entity_type, status, attempt_count, last_error, created_at, synchronized_at').eq('actor_id', user.id).order('created_at', { ascending: false }).limit(100)
  if (error) return NextResponse.json({ error: 'Unable to load sync operations.' }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: staff } = await supabase.from('staff_users').select('status').eq('id', user.id).maybeSingle()
  if (staff?.status !== 'active') return NextResponse.json({ error: 'Staff approval required.' }, { status: 403 })
  const body = await request.json().catch(() => null)
  if (typeof body?.operation_key !== 'string' || !body.operation_key || typeof body?.entity_type !== 'string' || !body?.payload || typeof body.payload !== 'object') return NextResponse.json({ error: 'Invalid sync operation.' }, { status: 400 })
  const { data, error } = await supabase.from('sync_operations').upsert({ operation_key: body.operation_key, actor_id: user.id, entity_type: body.entity_type, entity_id: typeof body.entity_id === 'string' ? body.entity_id : null, payload: body.payload, status: 'pending' }, { onConflict: 'operation_key', ignoreDuplicates: true }).select('operation_key, status').maybeSingle()
  if (error) return NextResponse.json({ error: 'Unable to queue sync operation.' }, { status: 500 })
  return NextResponse.json({ data: data ?? { operation_key: body.operation_key, status: 'pending' } }, { status: 202 })
}
