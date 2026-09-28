// Anotasi dokter: kuas 3 tingkat di atas citra asli, disimpan sebagai PNG mask grayscale
// seukuran citra asli. Nilai piksel: 0 latar, 85 Rendah, 170 Sedang, 255 Tinggi.

export type AnnotationLevel = "low" | "medium" | "high"

export const annotationLevels: {
  value: AnnotationLevel
  label: string
  color: string
  rgb: [number, number, number]
  gray: number
}[] = [
  { value: "low", label: "Rendah", color: "#22c55e", rgb: [34, 197, 94], gray: 85 },
  { value: "medium", label: "Sedang", color: "#eab308", rgb: [234, 179, 8], gray: 170 },
  { value: "high", label: "Tinggi", color: "#ef4444", rgb: [239, 68, 68], gray: 255 },
]

// keep: tidak ada perubahan (mask lama tetap dipakai); none: anotasi dikosongkan; png: mask baru.
export type AnnotationExport = { kind: "keep" } | { kind: "none" } | { kind: "png"; blob: Blob }

function nearestLevel(r: number, g: number, b: number) {
  let best = annotationLevels[0]
  let bestDistance = Infinity
  for (const level of annotationLevels) {
    const [lr, lg, lb] = level.rgb
    const distance = (r - lr) ** 2 + (g - lg) ** 2 + (b - lb) ** 2
    if (distance < bestDistance) {
      best = level
      bestDistance = distance
    }
  }
  return best
}

// Kanvas anotasi berwarna -> PNG grayscale. null bila tidak ada goresan.
export async function encodeMask(canvas: HTMLCanvasElement): Promise<Blob | null> {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!
  const src = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const out = new ImageData(canvas.width, canvas.height)
  let painted = false
  for (let i = 0; i < src.data.length; i += 4) {
    let gray = 0
    // Tepi goresan yang antialias (alpha rendah) tidak dihitung sebagai area.
    if (src.data[i + 3] >= 128) {
      gray = nearestLevel(src.data[i], src.data[i + 1], src.data[i + 2]).gray
      painted = true
    }
    out.data[i] = gray
    out.data[i + 1] = gray
    out.data[i + 2] = gray
    out.data[i + 3] = 255
  }
  if (!painted) return null

  const encoder = document.createElement("canvas")
  encoder.width = canvas.width
  encoder.height = canvas.height
  encoder.getContext("2d")!.putImageData(out, 0, 0)
  return new Promise((resolve) => encoder.toBlob((blob) => resolve(blob), "image/png"))
}

// PNG grayscale tersimpan -> kanvas anotasi berwarna (dimuat ulang saat kasus dibuka).
export function paintMask(canvas: HTMLCanvasElement, mask: HTMLImageElement) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!
  const reader = document.createElement("canvas")
  reader.width = canvas.width
  reader.height = canvas.height
  const readerCtx = reader.getContext("2d", { willReadFrequently: true })!
  readerCtx.drawImage(mask, 0, 0, canvas.width, canvas.height)
  const src = readerCtx.getImageData(0, 0, canvas.width, canvas.height)
  const out = ctx.createImageData(canvas.width, canvas.height)
  for (let i = 0; i < src.data.length; i += 4) {
    const gray = src.data[i]
    if (gray < 43) continue
    const level = annotationLevels.reduce((best, l) =>
      Math.abs(l.gray - gray) < Math.abs(best.gray - gray) ? l : best
    )
    out.data[i] = level.rgb[0]
    out.data[i + 1] = level.rgb[1]
    out.data[i + 2] = level.rgb[2]
    out.data[i + 3] = 255
  }
  ctx.putImageData(out, 0, 0)
}
