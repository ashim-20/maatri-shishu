const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STAFF_EMAIL', 'STAFF_PASSWORD']
for (const key of required) if (!process.env[key]) throw new Error(`Missing ${key}`)

const role = ['admin', 'supervisor', 'health_worker'].includes(process.env.STAFF_ROLE) ? process.env.STAFF_ROLE : 'health_worker'
const status = ['active', 'pending', 'suspended'].includes(process.env.STAFF_STATUS) ? process.env.STAFF_STATUS : 'pending'
const headers = { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' }
const base = process.env.SUPABASE_URL.replace(/\/$/, '')

const create = await fetch(`${base}/auth/v1/admin/users`, { method: 'POST', headers, body: JSON.stringify({ email: process.env.STAFF_EMAIL, password: process.env.STAFF_PASSWORD, email_confirm: true, user_metadata: { display_name: process.env.STAFF_NAME || process.env.STAFF_EMAIL.split('@')[0], role } }) })
const created = await create.json()
let userId = created.id
if (!create.ok) {
  if (!/already been registered|already exists/i.test(JSON.stringify(created))) throw new Error(JSON.stringify(created))
  const existingResponse = await fetch(`${base}/auth/v1/admin/users?page=1&per_page=100`, { headers })
  const existing = await existingResponse.json()
  const match = existing.users?.find((user) => user.email?.toLowerCase() === process.env.STAFF_EMAIL.toLowerCase())
  if (!match?.id) throw new Error('The Auth user already exists but could not be resolved from the first 100 users. Resolve it with an operator before retrying.')
  userId = match.id
  const update = await fetch(`${base}/auth/v1/admin/users/${userId}`, { method: 'PUT', headers, body: JSON.stringify({ email_confirm: true, user_metadata: { display_name: process.env.STAFF_NAME || process.env.STAFF_EMAIL.split('@')[0], role } }) })
  if (!update.ok) throw new Error(await update.text())
}

const upsert = await fetch(`${base}/rest/v1/staff_users?on_conflict=id`, { method: 'POST', headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ id: userId, display_name: process.env.STAFF_NAME || process.env.STAFF_EMAIL.split('@')[0], role, status }) })
if (!upsert.ok) throw new Error(await upsert.text())
console.log(`Provisioned ${process.env.STAFF_EMAIL} as ${role}/${status}.`)
