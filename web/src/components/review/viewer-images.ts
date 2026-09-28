// Tanpa "use client": hanya diimpor oleh komponen viewer (client).
import { useEffect, useState } from "react"

export type LoadedImage =
  | { status: "loading"; image: null }
  | { status: "ready"; image: HTMLImageElement }
  | { status: "error"; image: null }

// Memuat citra dari signed URL. crossOrigin wajib agar pikselnya bisa dibaca kanvas
// (pewarnaan heatmap, kontur ROI, dan anotasi).
export function useHtmlImage(url: string | null): LoadedImage {
  const [state, setState] = useState<{ url: string | null; result: LoadedImage }>({
    url: null,
    result: { status: "loading", image: null },
  })

  useEffect(() => {
    if (!url) return
    let cancelled = false
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => !cancelled && setState({ url, result: { status: "ready", image: img } })
    img.onerror = () => !cancelled && setState({ url, result: { status: "error", image: null } })
    img.src = url
    return () => {
      cancelled = true
    }
  }, [url])

  if (!url) return { status: "error", image: null }
  return state.url === url ? state.result : { status: "loading", image: null }
}

function pixelsOf(img: HTMLImageElement) {
  const canvas = document.createElement("canvas")
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0)
  return { canvas, ctx, data: ctx.getImageData(0, 0, canvas.width, canvas.height) }
}

// Colormap jet (setara COLORMAP_JET OpenCV yang dipakai pytorch-grad-cam).
function jet(t: number): [number, number, number] {
  const clamp = (v: number) => Math.max(0, Math.min(1, v))
  return [clamp(1.5 - Math.abs(4 * t - 3)), clamp(1.5 - Math.abs(4 * t - 2)), clamp(1.5 - Math.abs(4 * t - 1))].map(
    (v) => Math.round(v * 255)
  ) as [number, number, number]
}

const JET_LUT = Array.from({ length: 256 }, (_, i) => jet(i / 255))

// Heatmap Grad-CAM grayscale dari model (224x224) diwarnai jet untuk ditumpuk di atas citra asli.
export function colorizeHeatmap(img: HTMLImageElement) {
  const { canvas, ctx, data } = pixelsOf(img)
  const px = data.data
  for (let i = 0; i < px.length; i += 4) {
    const [r, g, b] = JET_LUT[px[i]]
    px[i] = r
    px[i + 1] = g
    px[i + 2] = b
    px[i + 3] = 255
  }
  ctx.putImageData(data, 0, 0)
  return canvas
}

// Mask ROI Otsu (resolusi citra asli): isian tipis dan kontur tegas. Kontur ditebalkan
// sebanding ukuran citra agar tetap terlihat saat citra diperkecil.
export function roiOverlay(img: HTMLImageElement, color: [number, number, number]) {
  const { canvas, ctx, data } = pixelsOf(img)
  const { width: w, height: h } = canvas
  const px = data.data
  const inside = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) inside[i] = px[i * 4] > 127 ? 1 : 0

  const t = Math.max(2, Math.round(Math.max(w, h) / 160))
  const out = ctx.createImageData(w, h)
  const o = out.data
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (!inside[i]) continue
      let edge = false
      for (let dy = -t; dy <= t && !edge; dy++) {
        for (let dx = -t; dx <= t; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || !inside[ny * w + nx]) {
            edge = true
            break
          }
        }
      }
      o[i * 4] = color[0]
      o[i * 4 + 1] = color[1]
      o[i * 4 + 2] = color[2]
      o[i * 4 + 3] = edge ? 255 : 64
    }
  }
  ctx.putImageData(out, 0, 0)
  return canvas
}
