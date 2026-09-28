import type { Metadata } from "next"

import { PageHeader } from "@/components/page-header"
import { PhasePlaceholder } from "@/components/page-states"

export const metadata: Metadata = { title: "Dashboard" }

export default function Page() {
  return (
    <>
      <PageHeader title="Dashboard" description="Ringkasan pasien, analisis AI, dan antrean review." />
      <PhasePlaceholder phase={3} items={["Statistik pasien, dokter, dan analisis", "Grafik analisis 7 hari dan distribusi prediksi", "Aktivitas terbaru"]} />
    </>
  )
}
