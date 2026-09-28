"use client"

import { createColumnHelper } from "@tanstack/react-table"
import { ImageUpIcon, MoreHorizontalIcon, PlusIcon, RotateCcwIcon, UsersIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import { PatientDialog, type PatientDialogTarget } from "@/app/admin/pasien/patient-dialog"
import { CaseStatusBadge } from "@/components/case-status-badge"
import { DataTable, TableSearch, type DataTableFeatures } from "@/components/data-table"
import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { PredictionBadge } from "@/components/prediction-badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { CaseStatus, ScanClass } from "@/lib/analysis"

export type PatientRow = {
  id: string
  code: string
  fullName: string
  age: number | undefined
  lastCaseId: string | undefined
  lastCaseAt: string | undefined
  // Waktu relatif dihitung di server agar tidak berbeda saat hidrasi.
  lastCaseLabel: string | undefined
  predictedClass: ScanClass | undefined
  status: CaseStatus | null
}

const helper = createColumnHelper<DataTableFeatures, PatientRow>()

export function PatientsView({ patients, openNew }: { patients: PatientRow[]; openNew: boolean }) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [dialog, setDialog] = useState<{ target: PatientDialogTarget | null; key: number }>({
    target: openNew ? { mode: "new" } : null,
    key: 0,
  })

  // Tautan "Tambah Pasien" dari dashboard membuka dialog lewat ?tambah=1; bersihkan URL-nya.
  useEffect(() => {
    if (openNew) router.replace("/admin/pasien", { scroll: false })
  }, [openNew, router])

  const open = (target: PatientDialogTarget) => setDialog((d) => ({ target, key: d.key + 1 }))
  const close = () => {
    setDialog((d) => ({ ...d, target: null }))
    router.refresh()
  }

  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor("code", {
          header: "Kode",
          cell: (info) => <span className="tabular">{info.getValue()}</span>,
        }),
        helper.accessor("fullName", {
          header: "Nama",
          cell: (info) => <span className="font-medium">{info.getValue()}</span>,
        }),
        helper.accessor("age", {
          header: "Usia",
          enableGlobalFilter: false,
          sortUndefined: "last",
          cell: (info) => {
            const age = info.getValue()
            return age === undefined ? (
              <span className="text-muted-foreground">-</span>
            ) : (
              <span className="tabular">{age} th</span>
            )
          },
        }),
        helper.accessor("lastCaseAt", {
          header: "Kasus terakhir",
          enableGlobalFilter: false,
          sortUndefined: "last",
          cell: (info) => (
            <span className="text-muted-foreground">{info.row.original.lastCaseLabel ?? "-"}</span>
          ),
        }),
        helper.accessor("predictedClass", {
          header: "Prediksi AI",
          enableGlobalFilter: false,
          enableSorting: false,
          cell: (info) => {
            const value = info.getValue()
            return value ? <PredictionBadge value={value} /> : <span className="text-muted-foreground">-</span>
          },
        }),
        helper.accessor("status", {
          header: "Status",
          enableGlobalFilter: false,
          enableSorting: false,
          cell: (info) => <CaseStatusBadge status={info.getValue()} />,
        }),
        helper.display({
          id: "actions",
          header: () => <span className="sr-only">Aksi</span>,
          cell: ({ row }) => {
            const p = row.original
            const patient = { id: p.id, code: p.code, fullName: p.fullName }
            return (
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={`Aksi untuk ${p.code}`}>
                      <MoreHorizontalIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onSelect={() => open({ mode: "upload", patient })}>
                      <ImageUpIcon />
                      Unggah citra baru
                    </DropdownMenuItem>
                    {p.status === "analysis_failed" && p.lastCaseId ? (
                      <DropdownMenuItem
                        onSelect={() => open({ mode: "retry", patient, caseId: p.lastCaseId! })}
                      >
                        <RotateCcwIcon />
                        Analisis ulang
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          },
        }),
      ]),
    []
  )

  const addButton = (
    <Button onClick={() => open({ mode: "new" })}>
      <PlusIcon />
      Tambah Pasien
    </Button>
  )

  return (
    <>
      <PageHeader
        title="Pasien"
        description={`${patients.length} pasien terdaftar`}
        actions={
          patients.length > 0 ? (
            <>
              <TableSearch
                value={search}
                onChange={setSearch}
                placeholder="Cari nama atau kode pasien"
                label="Cari pasien"
              />
              {addButton}
            </>
          ) : null
        }
      />

      <Card className="gap-0 py-0">
        {patients.length > 0 ? (
          <DataTable
            label="Daftar pasien"
            columns={columns}
            data={patients}
            getRowId={(p) => p.id}
            globalFilter={search}
            onGlobalFilterChange={setSearch}
            noResults="Tidak ada pasien yang cocok dengan pencarian."
          />
        ) : (
          <EmptyState
            icon={UsersIcon}
            title="Belum ada pasien"
            description="Tambahkan pasien lalu unggah citra USG untuk dianalisis AI."
            action={addButton}
          />
        )}
      </Card>

      <PatientDialog target={dialog.target} openKey={dialog.key} onClose={close} />
    </>
  )
}
