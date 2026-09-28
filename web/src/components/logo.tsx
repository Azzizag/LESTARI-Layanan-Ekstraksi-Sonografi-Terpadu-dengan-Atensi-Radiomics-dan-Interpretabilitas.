import { cn } from "@/lib/utils"

// Logo Sonara dari docs/prototype/index.html.
export function LogoMark({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <rect width="32" height="32" rx="9" fill="var(--primary)" />
      <path
        d="M9 21c0-5 3-9 7-9s7 4 7 9"
        stroke="var(--primary-foreground)"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M12.5 21c0-2.8 1.6-5 3.5-5s3.5 2.2 3.5 5"
        stroke="var(--primary-foreground)"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
        opacity=".7"
      />
      <circle cx="16" cy="21" r="2" fill="var(--brand-rose)" />
    </svg>
  )
}
