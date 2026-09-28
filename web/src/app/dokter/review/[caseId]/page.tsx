import { ArrowLeftIcon, FileSearchIcon, ScanSearchIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { z } from "zod"

import { EmptyState } from "@/components/empty-state"
import { ReviewConsole, type CaseNavigation } from "@/components/review/review-console"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { requireRole } from "@/lib/auth"
import { formatRelativeInline } from "@/lib/format"
import { getQueueCases, getReviewCase } from "@/lib/review"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Konsol Review" }

function BackToQueue() {
  return (
    <Button asChild variant="outline">
      <Link href="/dokter">
        <ArrowLeftIcon />
        Kembali ke antrean
      </Link>
    </Button>
  )
}

export default async function Page({ params }: PageProps<"/dokter/review/[caseId]">) {
  const profile = await requireRole("doctor")
  const { caseId } = await params
  const supabase = await createClient()

  const validId = z.uuid().safeParse(caseId).success
  const [data, queue] = await Promise.all([
    validId ? getReviewCase(supabase, caseId) : null,
    getQueueCases(supabase),
  ])

  if (!data) {
    return (
      <Card className="mx-auto mt-10 max-w-lg">
        <EmptyState
          icon={FileSearchIcon}
          title="Kasus tidak ditemukan"
          description="Kasus mungkin sudah dihapus atau tautannya salah."
          action={<BackToQueue />}
        />
      </Card>
    )
  }

  if (!data.prediction) {
    return (
      <Card className="mx-auto mt-10 max-w-lg">
        <EmptyState
          icon={ScanSearchIcon}
          title="Kasus belum memiliki hasil AI"
          description={`Citra ${data.patient.code} belum berhasil dianalisis. Admin dapat menjalankan analisis ulang dari halaman pasien.`}
          action={<BackToQueue />}
        />
      </Card>
    )
  }

  // Navigasi mengikuti urutan antrean: Prioritas, Menunggu review, lalu Selesai.
  const index = queue.findIndex((c) => c.caseId === caseId)
  const navigation: CaseNavigation = {
    previousId: index > 0 ? queue[index - 1].caseId : null,
    nextId: index >= 0 && index < queue.length - 1 ? queue[index + 1].caseId : null,
    nextPendingId: queue.find((c) => c.caseId !== caseId && c.status !== "done")?.caseId ?? null,
  }

  const now = new Date()
  return (
    <ReviewConsole
      key={caseId}
      data={data}
      prediction={data.prediction}
      navigation={navigation}
      labels={{
        uploaded: formatRelativeInline(data.createdAt, now),
        processed: formatRelativeInline(data.prediction.createdAt, now),
      }}
      existingReview={
        data.review
          ? {
              finalClass: data.review.finalClass,
              notes: data.review.notes,
              doctorName: data.review.doctorName,
              isOwn: data.review.doctorId === profile.id,
              savedLabel: formatRelativeInline(data.review.updatedAt, now),
            }
          : null
      }
    />
  )
}
