import type { Metadata } from "next"

import { LoginForm } from "@/app/login/login-form"
import { LogoMark } from "@/components/logo"
import { Card, CardContent } from "@/components/ui/card"
import { siteConfig } from "@/config/site"

export const metadata: Metadata = { title: "Masuk" }

const notices: Record<string, string> = {
  nonaktif: "Akun Anda nonaktif atau belum terdaftar. Hubungi admin faskes.",
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams

  return (
    <main className="grid min-h-svh place-items-center p-6">
      <div className="w-full max-w-[400px]">
        <Card className="gap-0 py-7 shadow-sm">
          <CardContent className="px-7">
            <div className="mb-6 flex items-center gap-3">
              <LogoMark size={36} />
              <div>
                <h1 className="text-lg leading-tight font-bold">{siteConfig.name}</h1>
                <p className="text-xs font-medium text-muted-foreground">Masuk ke akun Anda</p>
              </div>
            </div>
            <LoginForm
              next={typeof next === "string" ? next : undefined}
              notice={typeof error === "string" ? notices[error] : undefined}
              demoMode={siteConfig.demoMode}
            />
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">{siteConfig.disclaimer}</p>
      </div>
    </main>
  )
}
