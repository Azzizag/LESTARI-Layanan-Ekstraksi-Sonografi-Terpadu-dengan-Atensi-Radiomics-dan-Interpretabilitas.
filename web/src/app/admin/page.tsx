import {
  ActivityIcon,
  ClockIcon,
  CpuIcon,
  FileTextIcon,
  ImageIcon,
  PlusIcon,
  ScanSearchIcon,
  StethoscopeIcon,
  UserPlusIcon,
  UsersIcon,
  XCircleIcon,
  type LucideIcon,
} from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { AnalysisChart, PredictionChart, type DailyCount } from "@/app/admin/dashboard-charts"
import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getRecentActivity, type ActivityKind } from "@/lib/activity"
import { SCAN_CLASSES, type ScanClass } from "@/lib/analysis"
import { requireRole } from "@/lib/auth"
import { dayKey, formatDate, formatRelative, startOfDay, weekdayShort } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Dashboard" }

const activityIcon: Record<ActivityKind, { icon: LucideIcon; className: string }> = {
  patient: { icon: UserPlusIcon, className: "bg-primary-soft text-primary" },
  analysis: { icon: CpuIcon, className: "bg-primary-soft text-primary" },
  analysis_failed: { icon: XCircleIcon, className: "bg-benign-bg text-benign" },
  review: { icon: StethoscopeIcon, className: "bg-normal-bg text-normal" },
  report: { icon: FileTextIcon, className: "bg-muted text-muted-foreground" },
  doctor: { icon: StethoscopeIcon, className: "bg-muted text-muted-foreground" },
  other: { icon: ActivityIcon, className: "bg-muted text-muted-foreground" },
}

function must<T>(result: { data: T | null; error: unknown }): T {
  if (result.error || result.data === null) throw new Error("Data dashboard gagal dimuat.")
  return result.data
}

function mustCount(result: { count: number | null; error: unknown }): number {
  if (result.error) throw new Error("Data dashboard gagal dimuat.")
  return result.count ?? 0
}

export default async function Page() {
  await requireRole("admin")
  const supabase = await createClient()

  const now = new Date()
  const today = startOfDay(now)
  const weekStart = startOfDay(now, -6)
  const head = { count: "exact", head: true } as const

  const [
    patientsTotal,
    patientsThisWeek,
    doctors,
    analysesTotal,
    analysesToday,
    waiting,
    priority,
    weekAnalyses,
    latestPredictions,
    activity,
  ] = await Promise.all([
    supabase.from("patients").select("*", head),
    supabase.from("patients").select("*", head).gte("created_at", weekStart.toISOString()),
    supabase.from("profiles").select("is_active").eq("role", "doctor"),
    supabase.from("predictions").select("*", head),
    supabase.from("predictions").select("*", head).gte("created_at", today.toISOString()),
    supabase.from("cases").select("*", head).in("status", ["awaiting_review", "priority"]),
    supabase.from("cases").select("*", head).eq("status", "priority"),
    supabase.from("predictions").select("created_at").gte("created_at", weekStart.toISOString()),
    supabase.from("case_overview").select("predicted_class").not("predicted_class", "is", null),
    getRecentActivity(supabase, 10),
  ])

  const doctorRows = must(doctors)
  const activeDoctors = doctorRows.filter((d) => d.is_active).length

  // Analisis per hari selama 7 hari terakhir (WIB), termasuk hari tanpa analisis.
  const perDay = new Map<string, number>()
  for (const p of must(weekAnalyses)) {
    const key = dayKey(p.created_at)
    perDay.set(key, (perDay.get(key) ?? 0) + 1)
  }
  const daily: DailyCount[] = Array.from({ length: 7 }, (_, i) => {
    const day = startOfDay(now, i - 6)
    const key = dayKey(day)
    return { date: formatDate(day), label: i === 6 ? "Hari ini" : weekdayShort(day), count: perDay.get(key) ?? 0 }
  })
  const weekTotal = daily.reduce((sum, d) => sum + d.count, 0)

  // Distribusi prediksi AI terbaru per kasus (view case_overview mengambil prediksi terakhir).
  const distribution = Object.fromEntries(SCAN_CLASSES.map((c) => [c, 0])) as Record<ScanClass, number>
  for (const row of must(latestPredictions)) {
    if (row.predicted_class) distribution[row.predicted_class] += 1
  }
  const distributionTotal = SCAN_CLASSES.reduce((sum, c) => sum + distribution[c], 0)

  const priorityCount = mustCount(priority)

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Ringkasan pasien, analisis AI, dan antrean review."
        actions={
          <Button asChild>
            <Link href="/admin/pasien?tambah=1">
              <PlusIcon />
              Tambah Pasien
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Pasien"
          value={mustCount(patientsTotal)}
          caption={`+${mustCount(patientsThisWeek)} dalam 7 hari terakhir`}
          icon={UsersIcon}
        />
        <StatCard
          label="Dokter Aktif"
          value={activeDoctors}
          caption={`dari ${doctorRows.length} akun dokter`}
          icon={StethoscopeIcon}
        />
        <StatCard
          label="Citra Dianalisis"
          value={mustCount(analysesTotal)}
          caption={`+${mustCount(analysesToday)} hari ini`}
          icon={ImageIcon}
        />
        <StatCard
          label="Menunggu Review"
          value={mustCount(waiting)}
          caption={`${priorityCount} prioritas`}
          icon={ClockIcon}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Analisis 7 hari terakhir</CardTitle>
            <CardDescription>Jumlah citra yang dianalisis AI per hari</CardDescription>
          </CardHeader>
          <CardContent>
            {weekTotal > 0 ? (
              <AnalysisChart data={daily} />
            ) : (
              <EmptyState
                icon={ScanSearchIcon}
                title="Belum ada analisis minggu ini"
                description="Grafik terisi setelah citra USG diunggah dan dianalisis."
                className="py-8"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribusi prediksi AI</CardTitle>
            <CardDescription>Prediksi terbaru setiap kasus</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 items-center">
            {distributionTotal > 0 ? (
              <PredictionChart counts={distribution} />
            ) : (
              <EmptyState
                icon={CpuIcon}
                title="Belum ada prediksi"
                description="Distribusi Normal, Benign, dan Malignant tampil di sini."
                className="w-full py-8"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 gap-0 pb-0">
        <CardHeader className="pb-3">
          <CardTitle>Aktivitas terbaru</CardTitle>
        </CardHeader>
        {activity.length > 0 ? (
          <ul className="divide-y border-t">
            {activity.map((item) => {
              const { icon: Icon, className } = activityIcon[item.kind]
              return (
                <li key={item.id} className="flex items-center gap-3 px-6 py-2.5 text-[13px]">
                  <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg", className)}>
                    <Icon className="size-3.5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.text}</span>
                  <span className="hidden w-40 shrink-0 truncate text-muted-foreground md:block">
                    {item.actorName}
                  </span>
                  <time
                    dateTime={item.createdAt}
                    className="w-28 shrink-0 text-right whitespace-nowrap text-muted-foreground"
                  >
                    {formatRelative(item.createdAt, now)}
                  </time>
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState
            icon={ActivityIcon}
            title="Belum ada aktivitas"
            description="Penambahan pasien, analisis AI, dan diagnosis dokter tercatat di sini."
            className="border-t"
          />
        )}
      </Card>
    </>
  )
}
