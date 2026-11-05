"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    if (password.length < 8) return setError("Password must be at least 8 characters.")
    if (password !== confirm) return setError("Passwords do not match.")
    const { error: updateError } = await createClient().auth.updateUser({ password })
    if (updateError) return setError("We could not update your password. Request a new link and try again.")
    setMessage("Your password has been updated. You can sign in now.")
    window.setTimeout(() => window.location.assign("/login"), 1200)
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="reset-title">
        <p className="eyebrow">Maatri-Shishu</p>
        <h1 id="reset-title">Create a new password</h1>
        <p className="auth-copy">Use a strong password with at least 8 characters.</p>
        <form className="auth-form" onSubmit={submit}>
          <label htmlFor="password">New password</label>
          <input id="password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <label htmlFor="confirm">Confirm password</label>
          <input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required />
          {error && <p className="auth-error" role="alert">{error}</p>}
          {message && <p className="auth-success" role="status">{message}</p>}
          <button className="auth-submit" type="submit">Update password</button>
        </form>
        <Link className="auth-link" href="/login">Return to sign in</Link>
      </section>
    </main>
  )
}
