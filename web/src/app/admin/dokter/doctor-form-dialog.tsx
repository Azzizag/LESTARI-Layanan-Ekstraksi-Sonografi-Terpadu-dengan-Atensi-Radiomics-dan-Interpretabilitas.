// Tanpa "use client": hanya diimpor oleh doctors-view (komponen client).
import { zodResolver } from "@hookform/resolvers/zod"
import { EyeIcon, EyeOffIcon, TriangleAlertIcon } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { createDoctor, updateDoctor } from "@/app/admin/dokter/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { doctorCreateSchema, type DoctorCreateInput } from "@/lib/validators"

export type DoctorFormTarget =
  | { mode: "create" }
  | { mode: "edit"; id: string; fullName: string; email: string | null }

// Mode ubah hanya mengganti nama; email dan kata sandi tidak diubah dari sini.
const editSchema = doctorCreateSchema.pick({ fullName: true })

export function DoctorFormDialog({
  target,
  openKey,
  onClose,
}: {
  target: DoctorFormTarget | null
  openKey: number
  onClose: () => void
}) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      {target ? (
        <DialogContent className="gap-5 p-6 sm:max-w-md">
          {target.mode === "create" ? (
            <CreateForm key={openKey} onDone={onClose} />
          ) : (
            <EditForm key={openKey} target={target} onDone={onClose} />
          )}
        </DialogContent>
      ) : null}
    </Dialog>
  )
}

function CreateForm({ onDone }: { onDone: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const form = useForm<DoctorCreateInput>({
    resolver: zodResolver(doctorCreateSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  })
  const { errors, isSubmitting } = form.formState

  const submit = form.handleSubmit(async () => {
    setServerError(null)
    const values = form.getValues()
    const result = await createDoctor(values)
    if (result.ok) {
      toast.success(`Akun ${values.fullName.trim()} dibuat. Dokter dapat masuk dengan email dan kata sandi ini.`)
      return onDone()
    }
    setServerError(result.error)
    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      form.setError(field as keyof DoctorCreateInput, { message })
    }
  })

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <DialogHeader>
        <DialogTitle className="text-lg">Tambah dokter</DialogTitle>
        <DialogDescription>Akun baru langsung aktif dan dapat meninjau kasus.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4">
        <Field id="doctor-name" label="Nama lengkap dengan gelar" error={errors.fullName?.message}>
          <Input id="doctor-name" placeholder="dr. Rahma Aulia" autoFocus {...form.register("fullName")} />
        </Field>
        <Field id="doctor-email" label="Email" error={errors.email?.message}>
          <Input id="doctor-email" type="email" autoComplete="off" {...form.register("email")} />
        </Field>
        <Field
          id="doctor-password"
          label="Kata sandi awal"
          error={errors.password?.message}
          hint="Minimal 8 karakter. Sampaikan langsung ke dokter yang bersangkutan."
        >
          <div className="relative">
            <Input
              id="doctor-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              className="pr-10"
              {...form.register("password")}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </Button>
          </div>
        </Field>
      </div>
      <ServerError message={serverError} />
      <DialogFooter className="-mx-6 -mb-6 px-6">
        <Button type="button" variant="outline" onClick={onDone} disabled={isSubmitting}>
          Batal
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Membuat akun..." : "Buat akun"}
        </Button>
      </DialogFooter>
    </form>
  )
}

function EditForm({
  target,
  onDone,
}: {
  target: Extract<DoctorFormTarget, { mode: "edit" }>
  onDone: () => void
}) {
  const [serverError, setServerError] = useState<string | null>(null)
  const form = useForm<z.input<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    defaultValues: { fullName: target.fullName },
  })
  const { errors, isSubmitting } = form.formState

  const submit = form.handleSubmit(async () => {
    setServerError(null)
    const result = await updateDoctor({ id: target.id, fullName: form.getValues("fullName") })
    if (result.ok) {
      toast.success("Data dokter disimpan.")
      return onDone()
    }
    setServerError(result.error)
    if (result.fieldErrors?.fullName) form.setError("fullName", { message: result.fieldErrors.fullName })
  })

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <DialogHeader>
        <DialogTitle className="text-lg">Ubah data dokter</DialogTitle>
        <DialogDescription>{target.email ?? "Email tidak tersedia"}</DialogDescription>
      </DialogHeader>
      <Field id="doctor-edit-name" label="Nama lengkap dengan gelar" error={errors.fullName?.message}>
        <Input id="doctor-edit-name" autoFocus {...form.register("fullName")} />
      </Field>
      <ServerError message={serverError} />
      <DialogFooter className="-mx-6 -mb-6 px-6">
        <Button type="button" variant="outline" onClick={onDone} disabled={isSubmitting}>
          Batal
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Menyimpan..." : "Simpan"}
        </Button>
      </DialogFooter>
    </form>
  )
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

function ServerError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
      <TriangleAlertIcon className="size-4" aria-hidden="true" />
      {message}
    </p>
  )
}
