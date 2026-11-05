"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function SignUpPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", assignment: "" })
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage(null)
    const supabase = createClient()
    const redirect = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`
    const { data, error } = await supabase.auth.signUp({ email: form.email, password: form.password, options: { emailRedirectTo: redirect, data: { display_name: form.name, role: form.assignment } } })
    setPending(false)
    if (error) { setMessage("We could not create your account. Check your details and try again."); return }
    if (data.session) { window.location.assign("/"); return }
    setMessage("Account created. Check your email to confirm, then sign in to open the dashboard.")
  }

  return <main className="auth-shell"><section className="auth-card" aria-labelledby="signup-title"><div className="brand-mark"><span className="brand-dot" /> Maatri-Shishu</div><p className="eyebrow">Create your workspace account</p><h1 id="signup-title">Create an account</h1><p className="auth-copy">Sign up to use the Maatri-Shishu MVP workspace.</p><form onSubmit={submit} className="auth-form"><label htmlFor="name">Full name</label><input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><label htmlFor="assignment">Assignment</label><select id="assignment" required value={form.assignment} onChange={(e) => setForm({ ...form, assignment: e.target.value })}><option value="">Select assignment</option><option value="fchv">FCHV</option><option value="health_worker">Health-post worker</option></select><label htmlFor="email">Work email</label><input id="email" type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /><label htmlFor="password">Password</label><input id="password" type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><button className="primary-button" disabled={pending}>{pending ? "Submitting…" : "Create account"}</button></form>{message && <p className="auth-message" role="status">{message}</p>}<div className="auth-links"><Link href="/login">Back to sign in</Link></div></section></main>
}
