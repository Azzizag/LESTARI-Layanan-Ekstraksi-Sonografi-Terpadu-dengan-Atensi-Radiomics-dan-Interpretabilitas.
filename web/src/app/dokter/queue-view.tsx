"use client"

import { createColumnHelper } from "@tanstack/react-table"
import { CircleCheckIcon, ClipboardListIcon, TriangleAlertIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"

import { DataTable, TableSearch, type DataTableFeatures } from "@/components/data-table"
import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { PredictionBadge } from "@/components/prediction-badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatPercent } from "@/lib/analysis"
import type { QueueCase, QueueStatus } from "@/lib/review"

export type QueueRow = QueueCase & { createdLabel: string; reviewedLabel: string | undefined }

const tabs: { value: QueueStatus; label: string }[] = [
  { value: "priority", label: "Prioritas" },
  { value: "awaiting_review", label: "Menunggu Review" },
  { value: "done", label: "Selesai" },
]

const emptyText: Record<QueueStatus, { title: string; description: string }> = {
  priority: {
    title: "Tidak ada kasus prioritas",
    description: "Kasus dengan prediksi Malignant atau P(Malignant) tinggi akan muncul di sini.",
  },
  awaiting_review: {
    title: "Tidak ada kasus yang menunggu",
    description: "Kasus baru akan muncul di sini setelah admin mengunggah citra.",
  },
  done: {
    title: "Belum ada kasus selesai",
    description: "Kasus yang sudah Anda diagnosis tersimpan di tab ini.",
  },
}

const helper = createColumnHelper<DataTableFeatures, QueueRow>()

function reviewHref(caseId: string) {
  return `/dokter/review/${caseId}`
}

export function QueueView({ cases, initialTab }: { cases: QueueRow[]; initialTab: QueueStatus | null }) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const counts = useMemo(
    () =>
      Object.fromEntries(tabs.map((t) => [t.value, cases.filter((c) => c.status === t.value).length])) as Record<
        QueueStatus,
        number
      >,
    [cases]
  )
  // Tanpa pilihan di URL, buka tab pertama yang berisi kasus.
  const [tab, setTab] = useState<QueueStatus>(
    initialTab ?? tabs.find((t) => counts[t.value] > 0)?.value ?? "priority"
  )
  const rows = useMemo(() => cases.filter((c) => c.status === tab), [cases, tab])

  function changeTab(value: string) {
    const next = value as QueueStatus
    setTab(next)
    window.history.replaceState(null, "", `?tab=${next}`)
  }

  const columns = useMemo(() => {
    const base = [
      helper.accessor("patientCode", {
        header: "Kode",
        cell: (info) => <span className="tabular">{info.getValue()}</span>,
      }),
      helper.accessor("patientName", {
        header: "Pasien",
        cell: (info) => {
          const age = info.row.original.age
          return (
            <div>
              <p className="font-medium">{info.getValue()}</p>
              {age !== undefined ? <p className="text-xs text-muted-foreground">{age} tahun</p> : null}
            </div>
          )
        },
      }),
      helper.accessor("predictedClass", {
        header: "Prediksi AI",
        enableGlobalFilter: false,
        enableSorting: false,
        cell: (info) => <PredictionBadge value={info.getValue()} />,
      }),
      helper.accessor("probMalignant", {
        header: "P(Malignant)",
        enableGlobalFilter: false,
        cell: (info) => (
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <span
                className="block h-full rounded-full bg-malignant"
                style={{ width: `${Math.max(info.getValue() * 100, 1)}%` }}
              />
            </span>
            <span className="tabular text-xs">{formatPercent(info.getValue())}</span>
          </div>
        ),
      }),
    ]
    const doneColumns =
      tab === "done"
        ? [
            helper.accessor("finalClass", {
              header: "Diagnosis dokter",
              enableGlobalFilter: false,
              enableSorting: false,
              cell: (info) => {
                const value = info.getValue()
                const agrees = info.row.original.agreesWithAi
                return value ? (
                  <div className="flex items-center gap-2">
                    <PredictionBadge value={value} />
                    {agrees !== undefined ? (
                      <span
                        className={agrees ? "text-xs text-normal" : "text-xs text-benign"}
                        title={agrees ? "Sesuai dengan prediksi AI" : "Berbeda dengan prediksi AI"}
                      >
                        {agrees ? (
                          <CircleCheckIcon className="inline size-3.5" aria-hidden="true" />
                        ) : (
                          <TriangleAlertIcon className="inline size-3.5" aria-hidden="true" />
                        )}{" "}
                        {agrees ? "Sesuai AI" : "Berbeda"}
                      </span>
                    ) : null}
                  </div>
                ) : null
              },
            }),
          ]
        : []
    const time = helper.accessor(tab === "done" ? "reviewedAt" : "createdAt", {
      id: "time",
      header: tab === "done" ? "Direview" : "Diunggah",
      enableGlobalFilter: false,
      cell: (info) => (
        <span className="text-muted-foreground">
          {tab === "done" ? info.row.original.reviewedLabel : info.row.original.createdLabel}
        </span>
      ),
    })
    const action = helper.display({
      id: "actions",
      header: () => <span className="sr-only">Aksi</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button asChild size="sm" variant={row.original.status === "done" ? "outline" : "default"}>
            <Link href={reviewHref(row.original.caseId)} onClick={(e) => e.stopPropagation()}>
              {row.original.status === "done" ? "Lihat" : "Review"}
            </Link>
          </Button>
        </div>
      ),
    })
    return helper.columns([...base, ...doneColumns, time, action])
  }, [tab])

  return (
    <>
      <PageHeader
        title="Antrean kerja"
        description="Kasus diurutkan dari probabilitas Malignant tertinggi."
        actions={
          <TableSearch
            value={search}
            onChange={setSearch}
            placeholder="Cari nama atau kode pasien"
            label="Cari kasus"
          />
        }
      />

      <Card className="gap-0 py-0">
        <Tabs value={tab} onValueChange={changeTab} className="border-b px-4 pt-3">
          <TabsList variant="line" className="h-10">
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="gap-2 px-3">
                {t.label}
                <span className="tabular rounded-full bg-muted px-1.5 text-xs text-muted-foreground">
                  {counts[t.value]}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {rows.length > 0 ? (
          <DataTable
            key={tab}
            label={`Kasus ${tabs.find((t) => t.value === tab)?.label}`}
            columns={columns}
            data={rows}
            getRowId={(c) => c.caseId}
            globalFilter={search}
            onGlobalFilterChange={setSearch}
            noResults="Tidak ada kasus yang cocok dengan pencarian."
            onRowClick={(c) => router.push(reviewHref(c.caseId))}
            // Garis kiri merah tipis untuk kasus prioritas, bukan latar merah penuh.
            getRowClassName={(c) =>
              c.status === "priority" ? "[&>td:first-child]:shadow-[inset_3px_0_0_var(--malignant)]" : undefined
            }
          />
        ) : (
          <EmptyState icon={ClipboardListIcon} {...emptyText[tab]} />
        )}
      </Card>
    </>
  )
}
