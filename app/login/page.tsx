"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setMessage(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage(error.message.toLowerCase().includes("confirm") ? "Please confirm your email before signing in." : "Invalid email or password.")
      setPending(false)
      return
    }
    window.location.assign("/")
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="brand-mark"><span className="brand-dot" /> Maatri-Shishu</div>
        <p className="eyebrow">Field health workspace</p>
        <h1 id="login-title">Sign in to your workspace</h1>
        <p className="auth-copy">Sign in to access the Maatri-Shishu MVP workspace.</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="email">Work email</label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" required minLength={8} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <button className="primary-button" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
        </form>
        {message && <p className="auth-message" role="alert">{message}</p>}
        <div className="auth-links"><Link href="/forgot-password">Forgot password?</Link><Link href="/sign-up">Request an account</Link></div>
      </section>
    </main>
  )
}
