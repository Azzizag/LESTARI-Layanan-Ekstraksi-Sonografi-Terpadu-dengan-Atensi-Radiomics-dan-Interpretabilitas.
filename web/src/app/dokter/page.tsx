import type { Metadata } from "next"

import { QueueView, type QueueRow } from "@/app/dokter/queue-view"
import { requireRole } from "@/lib/auth"
import { formatRelative } from "@/lib/format"
import { getQueueCases, QUEUE_STATUSES, type QueueStatus } from "@/lib/review"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Antrean" }

export default async function Page({ searchParams }: PageProps<"/dokter">) {
  await requireRole("doctor")
  const supabase = await createClient()
  const cases = await getQueueCases(supabase)

  // Waktu relatif dihitung di server agar sama saat hidrasi.
  const now = new Date()
  const rows: QueueRow[] = cases.map((c) => ({
    ...c,
    createdLabel: formatRelative(c.createdAt, now),
    reviewedLabel: c.reviewedAt ? formatRelative(c.reviewedAt, now) : undefined,
  }))

  const { tab } = await searchParams
  const initialTab = QUEUE_STATUSES.find((s) => s === tab) ?? null
  return <QueueView cases={rows} initialTab={initialTab as QueueStatus | null} />
}
