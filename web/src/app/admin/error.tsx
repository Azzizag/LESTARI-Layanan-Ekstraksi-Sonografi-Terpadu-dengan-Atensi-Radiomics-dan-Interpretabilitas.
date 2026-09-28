"use client"

import { PageError } from "@/components/page-states"

export default function SegmentError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <PageError onRetry={retry} />
}
