import type { Metadata } from "next"

import { PageHeader } from "@/components/page-header"
import { PhasePlaceholder } from "@/components/page-states"

export const metadata: Metadata = { title: "Dokter" }

export default function Page() {
  return (
    <>
      <PageHeader title="Dokter" description="Akun dokter yang dapat meninjau kasus." />
      <PhasePlaceholder phase={3} items={["Tabel dokter dengan status Aktif/Nonaktif", "Tambah dan nonaktifkan akun dokter"]} />
    </>
  )
}
