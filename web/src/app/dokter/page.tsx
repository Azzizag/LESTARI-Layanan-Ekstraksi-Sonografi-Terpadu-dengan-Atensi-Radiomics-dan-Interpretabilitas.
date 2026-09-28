import type { Metadata } from "next"

import { PageHeader } from "@/components/page-header"
import { PhasePlaceholder } from "@/components/page-states"

export const metadata: Metadata = { title: "Antrean" }

export default function Page() {
  return (
    <>
      <PageHeader title="Antrean Kasus" description="Kasus yang menunggu diagnosis dokter." />
      <PhasePlaceholder phase={4} items={["Tab Prioritas, Menunggu Review, dan Selesai", "Konsol Review dengan heatmap Grad-CAM dan mask ROI"]} />
    </>
  )
}
