"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginForm({ linkFailed }: { linkFailed: boolean }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function sendLink(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setBusy(false)
    if (error) return toast.error(error.message)
    setSent(true)
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const { error } = await createClient().auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    })
    setBusy(false)
    if (error) return toast.error(error.message)
    router.replace("/")
    router.refresh()
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-bold tracking-tight">Tally</CardTitle>
        <CardDescription>
          {sent
            ? `We emailed ${email}. Tap the link, or type the code from the email below.`
            : "Sign in with your email. No password needed."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {linkFailed && !sent && (
          <p className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            That sign-in link didn&apos;t work (it may have expired or been opened in a different
            browser). Request a new one, or use the code instead.
          </p>
        )}
        {!sent ? (
          <form onSubmit={sendLink} className="grid gap-3">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
            />
            <Button type="submit" size="lg" className="h-11" disabled={busy}>
              {busy ? "Sending…" : "Email me a sign-in link"}
            </Button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="grid gap-3">
            <Label htmlFor="code">Code from email</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-11 text-center font-mono text-lg tracking-widest"
            />
            <Button type="submit" size="lg" className="h-11" disabled={busy}>
              {busy ? "Checking…" : "Sign in"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setSent(false)}>
              Use a different email
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
