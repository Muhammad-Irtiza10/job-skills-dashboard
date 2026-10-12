// "Forgot password" (request an email link) and "Reset password" (the page that link opens).
import React, { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, Mail, KeyRound } from "lucide-react"
import AppHeader from "@/components/AppHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiFetch } from "@/lib/api"

type Status = { text: string; error?: boolean } | null

function Shell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <AppHeader subtitle="Account" plain />
      <main className="mx-auto max-w-md px-4 py-10">
        <section className="news-block grid gap-5 p-6 sm:p-8" style={{ borderTopWidth: 4 }}>
          <div>
            <h1 className="text-3xl font-extrabold">{title}</h1>
            <p className="mt-1 text-ink-2">{sub}</p>
          </div>
          {children}
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-ink underline underline-offset-4">
            <ArrowLeft className="h-4 w-4" /> Back to login
          </Link>
        </section>
      </main>
    </div>
  )
}

const StatusLine = ({ status }: { status: Status }) =>
  status ? <p role="status" className={`text-sm ${status.error ? "font-semibold text-red-ink" : "text-ink-2"}`}>{status.text}</p> : null

export function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<Status>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const r = await apiFetch("/password-reset/", { method: "POST", body: JSON.stringify({ email }) })
      setStatus({ text: r.detail })
    } catch (err: any) {
      setStatus({ text: err.message.includes("429") ? "Too many requests. Try again in an hour." : "Something went wrong. Try again.", error: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell title="Forgot password?" sub="Enter your account email and we'll send you a link to choose a new password.">
      <form onSubmit={submit} className="grid gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="reset-email">Email</Label>
          <Input id="reset-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" />
        </div>
        <Button type="submit" className="h-11" disabled={busy}><Mail />{busy ? "Sending…" : "Send reset link"}</Button>
        <StatusLine status={status} />
      </form>
    </Shell>
  )
}

export function ResetPassword() {
  const { uid = "", token = "" } = useParams()
  const [pw, setPw] = useState({ next: "", confirm: "" })
  const [status, setStatus] = useState<Status>(null)
  const [done, setDone] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pw.next !== pw.confirm) return setStatus({ text: "The two passwords don't match.", error: true })
    try {
      const r = await apiFetch("/password-reset/confirm/", { method: "POST", body: JSON.stringify({ uid, token, new_password: pw.next }) })
      setStatus({ text: r.detail })
      setDone(true)
    } catch (err: any) {
      setStatus({ text: err.message.replace(/^API \d+: /, ""), error: true })
    }
  }

  return (
    <Shell title="Choose a new password" sub="Use at least 8 characters. Avoid common passwords and ones similar to your name or email.">
      {done ? (
        <StatusLine status={status} />
      ) : (
        <form onSubmit={submit} className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-pw">New password</Label>
            <Input id="new-pw" type="password" autoComplete="new-password" required value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-pw2">Confirm new password</Label>
            <Input id="new-pw2" type="password" autoComplete="new-password" required value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })} />
          </div>
          <Button type="submit" className="h-11"><KeyRound />Save new password</Button>
          <StatusLine status={status} />
        </form>
      )}
    </Shell>
  )
}
