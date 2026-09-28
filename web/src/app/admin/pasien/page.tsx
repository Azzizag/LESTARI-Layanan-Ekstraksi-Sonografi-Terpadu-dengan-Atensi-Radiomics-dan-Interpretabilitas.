import type { Metadata } from "next"
import { UsersIcon } from "lucide-react"

import { AnalyzePanel } from "@/components/analyze-panel"
import { PageHeader } from "@/components/page-header"
import { PhasePlaceholder } from "@/components/page-states"
import { Card } from "@/components/ui/card"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Pasien" }

export default async function Page() {
  await requireRole("admin")
  const supabase = await createClient()
  const { data: patients, error } = await supabase
    .from("patients")
    .select("id, code, full_name")
    .order("code")
  if (error) throw new Error("Data pasien gagal dimuat.")

  return (
    <>
      <PageHeader title="Pasien" description="Data pasien dan citra USG yang diunggah." />
      <div className="space-y-6">
        {patients.length > 0 ? (
          <AnalyzePanel
            patients={patients.map((p) => ({ id: p.id, code: p.code, fullName: p.full_name }))}
          />
        ) : (
          <Card className="items-center px-6 py-10 text-center">
            <span className="grid size-11 place-items-center rounded-full bg-primary-soft text-primary">
              <UsersIcon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-semibold">Belum ada pasien</h2>
              <p className="mt-1 text-muted-foreground">
                Citra USG diunggah untuk pasien yang sudah terdaftar.
              </p>
            </div>
          </Card>
        )}
        <PhasePlaceholder
          phase={3}
          items={["Tabel pasien dengan pencarian", "Dialog tambah pasien 2 langkah"]}
        />
      </div>
    </>
  )
}
