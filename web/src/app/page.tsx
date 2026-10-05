import {
  ArrowRightIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  CircleDotIcon,
  EyeIcon,
  FlaskConicalIcon,
  InfoIcon,
  ListOrderedIcon,
  StethoscopeIcon,
  TargetIcon,
} from "lucide-react"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

import { LogoMark } from "@/components/logo"
import { PublicHeader } from "@/components/public-header"
import { Button } from "@/components/ui/button"
import { roleHome, siteConfig } from "@/config/site"
import { goals, pilot, steps, team, type PilotStageStatus, type TeamMember } from "@/content/home"
import { modelCard } from "@/content/model-card"
import { getCurrentProfile } from "@/lib/auth"
import { formatInteger, formatPaperPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.name} · Pilot project deteksi dini kanker payudara` },
  description: pilot.lead,
}

const GOAL_ICON = {
  riset: FlaskConicalIcon,
  skrining: ListOrderedIcon,
  penjelasan: EyeIcon,
  dokter: StethoscopeIcon,
} as const

const STAGE_STATUS: Record<PilotStageStatus, { label: string; icon: typeof CircleCheckIcon; className: string }> = {
  done: { label: "Selesai", icon: CircleCheckIcon, className: "bg-normal-bg text-normal" },
  active: { label: "Berjalan", icon: CircleDotIcon, className: "bg-primary-soft text-primary" },
  planned: { label: "Rencana", icon: CircleDashedIcon, className: "border text-muted-foreground" },
}

const RESULTS = [
  { value: formatPaperPercent(modelCard.best.f1), label: "F1-score macro" },
  { value: formatPaperPercent(modelCard.best.recall), label: "Recall macro" },
  { value: formatPaperPercent(modelCard.best.accuracy), label: "Akurasi" },
  { value: formatInteger(modelCard.dataset.combined.total), label: "Citra USG (BUSI + Mendeley)" },
]

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold tracking-wider text-primary uppercase">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h2>
      {text ? <p className="mt-2 text-muted-foreground">{text}</p> : null}
    </div>
  )
}

function MemberCard({ member }: { member: TeamMember }) {
  return (
    <li className="flex items-center gap-4 rounded-xl border bg-card p-4">
      {member.photo ? (
        <Image
          src={member.photo}
          alt={`Foto ${member.name}`}
          width={56}
          height={56}
          className="size-14 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="grid size-14 shrink-0 place-items-center rounded-full bg-primary-soft text-base font-semibold text-primary"
        >
          {initials(member.name)}
        </span>
      )}
      <div className="min-w-0">
        <p className="font-semibold">{member.name}</p>
        <p className="text-sm text-muted-foreground">{member.affiliation}</p>
      </div>
    </li>
  )
}

export default async function Home() {
  const profile = await getCurrentProfile()
  const best = modelCard.best

  return (
    <div className="min-h-svh">
      <PublicHeader role={profile?.role ?? null} />

      <main>
        {/* Hero: tujuan pilot project langsung terlihat saat halaman dibuka */}
        <section className="mx-auto grid max-w-[1180px] items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
              <TargetIcon className="size-3.5" aria-hidden="true" />
              {pilot.badge}
            </span>
            <h1 className="mt-5 text-4xl leading-[1.1] font-bold tracking-tight sm:text-[44px]">{pilot.title}</h1>
            <p className="mt-5 max-w-xl text-[17px] text-muted-foreground">{pilot.lead}</p>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{siteConfig.name}</span>: {siteConfig.fullName}.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild className="h-11 px-5 text-[15px]">
                <Link href={profile ? roleHome[profile.role] : "/login"}>
                  {profile ? "Buka dasbor" : "Coba demo"}
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 px-5 text-[15px]">
                <Link href="/#tujuan">Tujuan pilot project</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">Tahapan pilot project</h2>
              <span className="text-xs text-muted-foreground">Status saat ini</span>
            </div>
            <ol className="mt-4 space-y-3">
              {pilot.stages.map((stage, index) => {
                const status = STAGE_STATUS[stage.status]
                const StatusIcon = status.icon
                return (
                  <li
                    key={stage.title}
                    className={cn(
                      "flex gap-3 rounded-xl border p-3",
                      stage.status === "active" && "border-primary/40 bg-primary-soft/40"
                    )}
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-background font-mono text-xs font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{stage.title}</p>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                            status.className
                          )}
                        >
                          <StatusIcon className="size-3" aria-hidden="true" />
                          {status.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">
                        {stage.detail}
                        {stage.status === "done" ? ` F1 ${formatPaperPercent(best.f1)} pada ${modelCard.dataset.test.total} citra uji.` : ""}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        </section>

        {/* Tentang pilot project */}
        <section id="pilot" className="scroll-mt-20 border-t bg-card">
          <div className="mx-auto grid max-w-[1180px] gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <SectionHeading eyebrow="Tentang" title="Apa itu pilot project ini?" />
              <div className="mt-4 space-y-3 text-muted-foreground">
                {pilot.about.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
            <div className="rounded-xl border bg-background p-5">
              <p className="flex items-center gap-2 font-semibold">
                <InfoIcon className="size-4 text-primary" aria-hidden="true" />
                Batasan tahap pilot
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                {pilot.limits.map((limit) => (
                  <li key={limit}>{limit}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Tujuan */}
        <section id="tujuan" className="mx-auto max-w-[1180px] scroll-mt-20 px-4 py-12 sm:px-6">
          <SectionHeading
            eyebrow="Tujuan"
            title="Yang ingin dicapai lewat pilot project ini"
            text="Empat tujuan ini menjadi ukuran apakah hasil riset layak dilanjutkan ke uji coba bersama dokter."
          />
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {goals.map((goal) => {
              const Icon = GOAL_ICON[goal.key]
              return (
                <li key={goal.key} className="rounded-xl border bg-card p-5">
                  <span className="grid size-9 place-items-center rounded-lg bg-primary-soft text-primary">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-semibold">{goal.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{goal.text}</p>
                </li>
              )
            })}
          </ul>

          <div className="mt-8 rounded-xl border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold">Hasil riset yang dipakai aplikasi</p>
              <Link
                href="/riset"
                className="inline-flex items-center gap-1 rounded text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                Lihat metode lengkap
                <ArrowRightIcon className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {RESULTS.map((item) => (
                <div key={item.label} className="flex flex-col-reverse">
                  <dt className="text-sm text-muted-foreground">{item.label}</dt>
                  <dd className="font-mono text-2xl font-semibold tabular-nums">{item.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              Metrik dihitung pada {modelCard.dataset.test.total} citra uji dari paper tim ({modelCard.modelName}).
            </p>
          </div>
        </section>

        {/* Cara kerja */}
        <section id="cara-kerja" className="scroll-mt-20 border-t bg-card">
          <div className="mx-auto max-w-[1180px] px-4 py-12 sm:px-6">
            <SectionHeading eyebrow="Cara kerja" title="Dari unggah citra sampai keputusan dokter" />
            <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => (
                <li key={step.title} className="rounded-xl border bg-background p-5">
                  <span className="font-mono text-xs font-semibold text-primary">0{index + 1}</span>
                  <h3 className="mt-2 font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Tim */}
        <section id="tim" className="mx-auto max-w-[1180px] scroll-mt-20 px-4 py-12 sm:px-6">
          <SectionHeading eyebrow="Tim" title={team.name} text={`Tim peneliti dan pengembang dari ${team.institution}.`} />
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {team.members.map((member) => (
              <MemberCard key={member.name} member={member} />
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            Paper: <span className="italic">{modelCard.paperTitle}</span>.
          </p>
        </section>
      </main>

      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2.5 font-semibold">
            <LogoMark size={24} />
            {siteConfig.name}
            <span className="font-normal text-muted-foreground">· Pilot project {team.name}</span>
          </div>
          <p className="max-w-md text-xs text-muted-foreground">
            {siteConfig.disclaimer} Data pasien pada demo ini fiktif.
          </p>
        </div>
      </footer>
    </div>
  )
}
