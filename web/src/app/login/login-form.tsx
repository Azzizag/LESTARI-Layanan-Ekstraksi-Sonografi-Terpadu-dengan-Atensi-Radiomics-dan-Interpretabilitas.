"use client"

import { EyeIcon, EyeOffIcon, Loader2Icon, StethoscopeIcon, UsersIcon } from "lucide-react"
import { useActionState, useState } from "react"

import { signIn, type SignInState } from "@/app/login/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Intent = "password" | "demo-admin" | "demo-doctor"

export function LoginForm({
  next,
  notice,
  demoMode,
}: {
  next?: string
  notice?: string
  demoMode: boolean
}) {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signIn, {})
  const [showPassword, setShowPassword] = useState(false)
  const [intent, setIntent] = useState<Intent>("password")

  const message = state.error ?? notice
  const spinner = (target: Intent) =>
    pending && intent === target ? <Loader2Icon className="animate-spin" /> : null

  return (
    <form action={formAction} className="grid gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div className="grid gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="nama@faskes.go.id"
          autoComplete="username"
          defaultValue={state.email}
          required
          className="h-10"
          aria-invalid={Boolean(state.error) && intent === "password"}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="password">Kata sandi</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Kata sandi akun"
            autoComplete="current-password"
            required
            className="h-10 pr-10"
            aria-invalid={Boolean(state.error) && intent === "password"}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </Button>
        </div>
      </div>

      <p
        role="alert"
        aria-live="polite"
        className="min-h-5 text-sm text-destructive empty:min-h-0"
      >
        {pending ? "" : message}
      </p>

      <Button
        type="submit"
        name="intent"
        value="password"
        size="lg"
        className="h-10 w-full"
        disabled={pending}
        onClick={() => setIntent("password")}
      >
        {spinner("password")}
        Masuk
      </Button>

      {demoMode ? (
        <>
          <div className="flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
            Mode demo
          </div>
          <div className="grid gap-2">
            <Button
              type="submit"
              name="intent"
              value="demo-admin"
              variant="outline"
              className="h-10 w-full"
              formNoValidate
              disabled={pending}
              onClick={() => setIntent("demo-admin")}
            >
              {spinner("demo-admin") ?? <UsersIcon />}
              Masuk sebagai Admin Demo
            </Button>
            <Button
              type="submit"
              name="intent"
              value="demo-doctor"
              variant="outline"
              className="h-10 w-full"
              formNoValidate
              disabled={pending}
              onClick={() => setIntent("demo-doctor")}
            >
              {spinner("demo-doctor") ?? <StethoscopeIcon />}
              Masuk sebagai Dokter Demo
            </Button>
          </div>
        </>
      ) : null}
    </form>
  )
}
