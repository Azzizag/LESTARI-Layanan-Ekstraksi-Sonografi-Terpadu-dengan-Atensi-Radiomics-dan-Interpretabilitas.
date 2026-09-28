"use client"

import { createColumnHelper } from "@tanstack/react-table"
import { CircleCheckIcon, PencilIcon, PlusIcon, StethoscopeIcon, UserRoundXIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import { setDoctorActive } from "@/app/admin/dokter/actions"
import { DoctorFormDialog, type DoctorFormTarget } from "@/app/admin/dokter/doctor-form-dialog"
import { DataTable, TableSearch, type DataTableFeatures } from "@/components/data-table"
import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { initials } from "@/lib/utils"

export type DoctorRow = {
  id: string
  fullName: string
  email: string | null
  isActive: boolean
  reviewCount: number
}

const helper = createColumnHelper<DataTableFeatures, DoctorRow>()

export function DoctorsView({ doctors }: { doctors: DoctorRow[] }) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [form, setForm] = useState<{ target: DoctorFormTarget | null; key: number }>({ target: null, key: 0 })
  const [deactivating, setDeactivating] = useState<DoctorRow | null>(null)
  const [pending, startTransition] = useTransition()

  const openForm = (target: DoctorFormTarget) => setForm((f) => ({ target, key: f.key + 1 }))
  const closeForm = () => {
    setForm((f) => ({ ...f, target: null }))
    router.refresh()
  }

  function changeActive(doctor: DoctorRow, active: boolean) {
    startTransition(async () => {
      const result = await setDoctorActive({ id: doctor.id, active })
      if (result.ok) {
        toast.success(active ? `${doctor.fullName} aktif kembali.` : `${doctor.fullName} dinonaktifkan.`)
        setDeactivating(null)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor("fullName", {
          header: "Nama",
          cell: (info) => (
            <div className="flex items-center gap-2.5">
              <Avatar className="size-7">
                <AvatarFallback className="bg-primary-soft text-[11px] font-semibold text-primary">
                  {initials(info.getValue())}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{info.getValue()}</span>
            </div>
          ),
        }),
        helper.accessor((d) => d.email ?? "", {
          id: "email",
          header: "Email",
          cell: (info) => <span className="text-muted-foreground">{info.getValue() || "-"}</span>,
        }),
        helper.accessor("isActive", {
          header: "Status",
          enableGlobalFilter: false,
          cell: (info) =>
            info.getValue() ? (
              <Badge className="bg-normal-bg text-normal">
                <CircleCheckIcon aria-hidden="true" />
                Aktif
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                <UserRoundXIcon aria-hidden="true" />
                Nonaktif
              </Badge>
            ),
        }),
        helper.accessor("reviewCount", {
          header: "Kasus direview",
          enableGlobalFilter: false,
          cell: (info) => <span className="tabular">{info.getValue()}</span>,
        }),
        helper.display({
          id: "actions",
          header: () => <span className="sr-only">Aksi</span>,
          cell: ({ row }) => {
            const d = row.original
            return (
              <div className="flex justify-end gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openForm({ mode: "edit", id: d.id, fullName: d.fullName, email: d.email })}
                  aria-label={`Ubah ${d.fullName}`}
                >
                  <PencilIcon />
                  Ubah
                </Button>
                {d.isActive ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDeactivating(d)}
                    aria-label={`Nonaktifkan ${d.fullName}`}
                  >
                    Nonaktifkan
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => changeActive(d, true)}
                    disabled={pending}
                    aria-label={`Aktifkan ${d.fullName}`}
                  >
                    Aktifkan
                  </Button>
                )}
              </div>
            )
          },
        }),
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handler hanya memakai setter yang stabil
    [pending]
  )

  const addButton = (
    <Button onClick={() => openForm({ mode: "create" })}>
      <PlusIcon />
      Tambah Dokter
    </Button>
  )

  return (
    <>
      <PageHeader
        title="Dokter"
        description="Kelola akun dokter yang dapat memvalidasi hasil AI."
        actions={
          doctors.length > 0 ? (
            <>
              <TableSearch
                value={search}
                onChange={setSearch}
                placeholder="Cari nama atau email dokter"
                label="Cari dokter"
              />
              {addButton}
            </>
          ) : null
        }
      />

      <Card className="gap-0 py-0">
        {doctors.length > 0 ? (
          <DataTable
            label="Daftar dokter"
            columns={columns}
            data={doctors}
            getRowId={(d) => d.id}
            globalFilter={search}
            onGlobalFilterChange={setSearch}
            noResults="Tidak ada dokter yang cocok dengan pencarian."
          />
        ) : (
          <EmptyState
            icon={StethoscopeIcon}
            title="Belum ada akun dokter"
            description="Buat akun agar dokter dapat meninjau hasil AI dan menetapkan diagnosis."
            action={addButton}
          />
        )}
      </Card>

      <DoctorFormDialog target={form.target} openKey={form.key} onClose={closeForm} />

      <AlertDialog open={deactivating !== null} onOpenChange={(open) => !open && !pending && setDeactivating(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nonaktifkan {deactivating?.fullName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Dokter tidak dapat masuk ke LESTARI. Riwayat diagnosis yang sudah disimpan tetap utuh, dan akun
              dapat diaktifkan kembali kapan saja.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => deactivating && changeActive(deactivating, false)}
            >
              {pending ? "Menonaktifkan..." : "Nonaktifkan"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
