// Tanpa "use client": hanya diimpor oleh komponen client (analyze-panel), jadi ikut bundel client-nya.
import { ImageUpIcon, TriangleAlertIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useDropzone, type FileRejection } from "react-dropzone"

import { Button } from "@/components/ui/button"
import { ACCEPTED_SCAN_TYPES, MAX_SCAN_BYTES } from "@/lib/scans"
import { cn } from "@/lib/utils"

const accept = Object.fromEntries(
  Object.entries(ACCEPTED_SCAN_TYPES).map(([mime, ext]) => [
    mime,
    ext === "jpg" ? [".jpg", ".jpeg"] : [`.${ext}`],
  ])
)

function rejectionMessage(rejections: FileRejection[]) {
  const code = rejections[0]?.errors[0]?.code
  if (code === "file-too-large") return "Ukuran file lebih dari 10 MB."
  if (code === "file-invalid-type") return "Format harus PNG atau JPG."
  if (code === "too-many-files") return "Pilih satu citra saja."
  return "File tidak dapat dipakai."
}

const sizeFormat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 })

// Area seret-lepas satu citra USG dengan pratinjau. Validasi di sini hanya untuk umpan balik cepat;
// server memeriksa ulang isi dan ukuran file.
export function UploadDropzone({
  file,
  onFileChange,
  disabled = false,
}: {
  file: File | null
  onFileChange: (file: File | null) => void
  disabled?: boolean
}) {
  const [error, setError] = useState<string | null>(null)
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept,
    maxSize: MAX_SCAN_BYTES,
    maxFiles: 1,
    multiple: false,
    disabled,
    noClick: Boolean(file),
    onDropAccepted: ([accepted]) => {
      setError(null)
      onFileChange(accepted)
    },
    onDropRejected: (rejections) => setError(rejectionMessage(rejections)),
  })

  return (
    <div className="space-y-2">
      <div
        {...getRootProps({
          className: cn(
            "relative flex min-h-56 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            isDragActive ? "border-primary bg-primary-soft" : "border-border bg-card",
            !file && !disabled && "cursor-pointer hover:border-primary/60",
            disabled && "opacity-60"
          ),
        })}
        aria-label="Area unggah citra USG"
      >
        <input {...getInputProps()} />
        {file && preview ? (
          <div className="flex w-full items-center gap-4 text-left">
            {/* Pratinjau lokal dari object URL; next/image tidak dipakai untuk blob lokal. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Pratinjau citra USG yang dipilih"
              className="size-40 shrink-0 rounded-lg bg-viewer object-contain"
            />
            <div className="min-w-0 space-y-1">
              <p className="truncate font-medium">{file.name}</p>
              <p className="tabular text-xs text-muted-foreground">
                {sizeFormat.format(file.size / 1024)} KB
              </p>
              {!disabled ? (
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={open}>
                  Ganti citra
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <span className="grid size-11 place-items-center rounded-full bg-primary-soft text-primary">
              <ImageUpIcon className="size-5" aria-hidden="true" />
            </span>
            <p className="font-medium">
              {isDragActive ? "Lepaskan citra di sini" : "Seret citra USG ke sini atau klik untuk memilih"}
            </p>
            <p className="text-xs text-muted-foreground">PNG atau JPG, maksimal 10 MB</p>
          </>
        )}
      </div>
      {error ? (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <TriangleAlertIcon className="size-4" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  )
}
