"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const supabase = createClient(); const redirect = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`; await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${redirect}?next=/reset-password` }); setMessage("If an account exists for that email, a reset link has been sent.") }
  return <main className="auth-shell"><section className="auth-card" aria-labelledby="forgot-title"><div className="brand-mark"><span className="brand-dot" /> Maatri-Shishu</div><p className="eyebrow">Account recovery</p><h1 id="forgot-title">Reset your password</h1><p className="auth-copy">We will send recovery instructions to your work email.</p><form onSubmit={submit} className="auth-form"><label htmlFor="email">Work email</label><input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /><button className="primary-button">Send reset link</button></form>{message && <p className="auth-message" role="status">{message}</p>}<div className="auth-links"><Link href="/login">Back to sign in</Link></div></section></main>
}
