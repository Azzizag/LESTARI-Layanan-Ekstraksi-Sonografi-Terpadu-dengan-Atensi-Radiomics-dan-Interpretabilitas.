// Tanpa "use client": hanya dimuat lewat next/dynamic dari ReviewConsole (komponen client).
import type Konva from "konva"
import type { KonvaEventObject } from "konva/lib/Node"
import {
  BrushIcon,
  Columns2Icon,
  EraserIcon,
  HandIcon,
  LoaderCircleIcon,
  RotateCcwIcon,
  TriangleAlertIcon,
  Undo2Icon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Image as KonvaImage, Layer, Stage } from "react-konva"

import {
  annotationLevels,
  encodeMask,
  paintMask,
  type AnnotationExport,
  type AnnotationLevel,
} from "@/components/review/annotation"
import { colorizeHeatmap, roiOverlay, useHtmlImage } from "@/components/review/viewer-images"
import { Slider } from "@/components/ui/slider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { ReviewImages } from "@/lib/review"
import { cn } from "@/lib/utils"

export type ViewerMode = "original" | "preprocessed" | "gradcam" | "roi"
type Tool = "pan" | "brush" | "erase"

const modes: { value: ViewerMode; label: string; tag: string }[] = [
  { value: "original", label: "Asli", tag: "Asli" },
  { value: "preprocessed", label: "Preprocessing", tag: "Preprocessing (median 5x5, CLAHE)" },
  { value: "gradcam", label: "Grad-CAM", tag: "Heatmap Grad-CAM" },
  { value: "roi", label: "Mask ROI", tag: "Mask ROI Otsu · area yang dipakai untuk radiomics" },
]

// Warna kontur ROI dibuat berbeda dari warna kelas agar tidak dibaca sebagai hasil klasifikasi.
const ROI_COLOR: [number, number, number] = [34, 211, 238]
const FRAME_GAP = 8
const MAX_ZOOM = 8
const MAX_UNDO = 30
const ANNOTATION_OPACITY = 0.55

type View = { scale: number; x: number; y: number }

function fitView(imgW: number, imgH: number, frameW: number, frameH: number): View {
  const scale = Math.min(frameW / imgW, frameH / imgH) * 0.94
  return { scale, x: (frameW - imgW * scale) / 2, y: (frameH - imgH * scale) / 2 }
}

// Tombol toolbar di atas latar viewer yang selalu gelap.
const darkButton =
  "inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] text-white/75 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60 disabled:pointer-events-none disabled:opacity-40 data-[active=true]:bg-white/15 data-[active=true]:text-white [&_svg]:size-4"

function IconButton({
  label,
  onClick,
  active,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={darkButton}
          onClick={onClick}
          aria-label={label}
          aria-pressed={active}
          data-active={active}
          disabled={disabled}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export default function ScanViewer({
  images,
  onExporterReady,
}: {
  images: ReviewImages
  // Panel keputusan memanggil fungsi ini saat menyimpan untuk mengambil mask anotasi.
  onExporterReady: (exporter: () => Promise<AnnotationExport>) => void
}) {
  const original = useHtmlImage(images.original)
  const preprocessed = useHtmlImage(images.preprocessed)
  const heatmap = useHtmlImage(images.heatmap)
  const roiMask = useHtmlImage(images.roiMask)
  const savedAnnotation = useHtmlImage(images.annotation)

  const heatmapCanvas = useMemo(() => (heatmap.image ? colorizeHeatmap(heatmap.image) : null), [heatmap.image])
  const roiCanvas = useMemo(() => (roiMask.image ? roiOverlay(roiMask.image, ROI_COLOR) : null), [roiMask.image])

  const [mode, setMode] = useState<ViewerMode>("gradcam")
  const [opacity, setOpacity] = useState(0.5)
  const [compare, setCompare] = useState(false)
  const [view, setView] = useState<View | null>(null)
  const [tool, setTool] = useState<Tool>("pan")
  const [level, setLevel] = useState<AnnotationLevel>("high")
  const [brushSize, setBrushSize] = useState(16)
  const [undoCount, setUndoCount] = useState(0)

  const img = original.image
  const imgW = img?.naturalWidth ?? 1
  const imgH = img?.naturalHeight ?? 1

  // ---------------------------------------------------------------------------
  // Kanvas anotasi seukuran citra asli
  // ---------------------------------------------------------------------------
  const annotationCanvas = useMemo(() => {
    if (!img) return null
    const canvas = document.createElement("canvas")
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    return canvas
  }, [img])
  const annotationLayer = useRef<Konva.Layer>(null)
  const undoStack = useRef<ImageData[]>([])
  const dirty = useRef(false)
  const drawing = useRef<{ x: number; y: number } | null>(null)

  // Mask tersimpan yang gagal dimuat tidak boleh tertimpa tanpa sengaja: alat anotasi dikunci.
  const hasSavedAnnotation = images.annotation !== null
  const annotationLocked = hasSavedAnnotation && savedAnnotation.status === "error"
  const annotationLoading = hasSavedAnnotation && savedAnnotation.status === "loading"

  useEffect(() => {
    if (!annotationCanvas || !savedAnnotation.image) return
    paintMask(annotationCanvas, savedAnnotation.image)
    annotationLayer.current?.batchDraw()
  }, [annotationCanvas, savedAnnotation.image])

  useEffect(() => {
    onExporterReady(async () => {
      if (!dirty.current || !annotationCanvas) return { kind: "keep" }
      const blob = await encodeMask(annotationCanvas)
      return blob ? { kind: "png", blob } : { kind: "none" }
    })
  }, [annotationCanvas, onExporterReady])

  function context() {
    return annotationCanvas?.getContext("2d", { willReadFrequently: true }) ?? null
  }

  function pushUndo() {
    const ctx = context()
    if (!ctx || !annotationCanvas) return
    undoStack.current.push(ctx.getImageData(0, 0, annotationCanvas.width, annotationCanvas.height))
    if (undoStack.current.length > MAX_UNDO) undoStack.current.shift()
    setUndoCount(undoStack.current.length)
  }

  function undo() {
    const ctx = context()
    const snapshot = undoStack.current.pop()
    if (!ctx || !snapshot) return
    ctx.putImageData(snapshot, 0, 0)
    dirty.current = true
    setUndoCount(undoStack.current.length)
    annotationLayer.current?.batchDraw()
  }

  function strokeTo(to: { x: number; y: number }, scale: number) {
    const ctx = context()
    const from = drawing.current
    if (!ctx || !from) return
    ctx.save()
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    // Ukuran kuas dalam piksel layar, jadi tebal goresan terasa sama pada zoom berapa pun.
    ctx.lineWidth = brushSize / scale
    if (tool === "erase") {
      ctx.globalCompositeOperation = "destination-out"
      ctx.strokeStyle = "#000"
    } else {
      ctx.strokeStyle = annotationLevels.find((l) => l.value === level)!.color
    }
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
    ctx.restore()
    drawing.current = to
    dirty.current = true
    annotationLayer.current?.batchDraw()
  }

  const canAnnotate = !annotationLocked && !annotationLoading && annotationCanvas !== null
  const annotating = canAnnotate && tool !== "pan"

  function onPointerDown(e: KonvaEventObject<PointerEvent>) {
    if (!annotating) return
    const point = e.target.getStage()?.getRelativePointerPosition()
    if (!point) return
    pushUndo()
    drawing.current = point
    strokeTo(point, current.scale)
  }

  function onPointerMove(e: KonvaEventObject<PointerEvent>) {
    if (!drawing.current) return
    const point = e.target.getStage()?.getRelativePointerPosition()
    if (point) strokeTo(point, current.scale)
  }

  function endStroke() {
    drawing.current = null
  }

  // ---------------------------------------------------------------------------
  // Ukuran frame, zoom, dan geser
  // ---------------------------------------------------------------------------
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: Math.floor(entry.contentRect.width), height: Math.floor(entry.contentRect.height) })
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const frameW = compare ? Math.max(0, (size.width - FRAME_GAP) / 2) : size.width
  const frameH = size.height
  const fit = fitView(imgW, imgH, frameW || 1, frameH || 1)
  const current = view ?? fit
  const zoomPercent = Math.round((current.scale / fit.scale) * 100)

  function zoomAt(factor: number, point: { x: number; y: number }) {
    setView((prev) => {
      const cur = prev ?? fit
      const scale = Math.min(Math.max(cur.scale * factor, fit.scale * 0.5), fit.scale * MAX_ZOOM)
      const k = scale / cur.scale
      return { scale, x: point.x - (point.x - cur.x) * k, y: point.y - (point.y - cur.y) * k }
    })
  }

  function onWheel(e: KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault()
    const pointer = e.target.getStage()?.getPointerPosition()
    if (pointer) zoomAt(e.evt.deltaY < 0 ? 1.1 : 1 / 1.1, pointer)
  }

  function onDragMove(e: KonvaEventObject<DragEvent>) {
    const stage = e.target.getStage()
    if (stage && e.target === stage) setView({ scale: current.scale, x: stage.x(), y: stage.y() })
  }

  function changeCompare() {
    setCompare((c) => !c)
    setView(null)
  }

  function chooseLevel(value: AnnotationLevel) {
    setLevel(value)
    setTool("brush")
  }

  // Pintasan: O overlay, B kuas, E penghapus, Ctrl+Z undo. Tidak aktif saat mengetik.
  const undoRef = useRef(undo)
  useEffect(() => {
    undoRef.current = undo
  })
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target?.closest("input, textarea, select, [contenteditable=true], [role=dialog], [role=alertdialog]")) return
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault()
        undoRef.current()
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const key = e.key.toLowerCase()
      if (key === "o") setMode((m) => (m === "gradcam" ? "original" : "gradcam"))
      else if (key === "b") setTool("brush")
      else if (key === "e") setTool("erase")
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const overlayMode = mode === "gradcam" || mode === "roi"
  const ready = original.status === "ready" && size.width > 0

  function renderFrame(frameMode: ViewerMode, main: boolean) {
    const tag = modes.find((m) => m.value === frameMode)?.tag
    const base = frameMode === "preprocessed" && preprocessed.image ? preprocessed.image : original.image
    const overlay = frameMode === "gradcam" ? heatmapCanvas : frameMode === "roi" ? roiCanvas : null
    return (
      <div
        key={main ? "main" : "compare"}
        className={cn(
          "relative overflow-hidden rounded-md",
          main && annotating ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"
        )}
        style={{ width: frameW, height: frameH }}
      >
        <Stage
          width={frameW}
          height={frameH}
          x={current.x}
          y={current.y}
          scaleX={current.scale}
          scaleY={current.scale}
          draggable={!(main && annotating)}
          onDragMove={onDragMove}
          onWheel={onWheel}
          onPointerDown={main ? onPointerDown : undefined}
          onPointerMove={main ? onPointerMove : undefined}
          onPointerUp={main ? endStroke : undefined}
          onPointerLeave={main ? endStroke : undefined}
        >
          <Layer listening={false}>
            {base ? <KonvaImage image={base} width={imgW} height={imgH} /> : null}
            {overlay ? <KonvaImage image={overlay} width={imgW} height={imgH} opacity={opacity} /> : null}
          </Layer>
          {main && annotationCanvas ? (
            <Layer ref={annotationLayer} listening={false}>
              <KonvaImage image={annotationCanvas} width={imgW} height={imgH} opacity={ANNOTATION_OPACITY} />
            </Layer>
          ) : null}
        </Stage>
        <span className="pointer-events-none absolute top-2 left-2 max-w-[calc(100%-1rem)] truncate rounded bg-black/60 px-2 py-0.5 text-[11px] font-medium tracking-wide text-white/90 uppercase">
          {tag}
        </span>
        {frameMode === "preprocessed" && !preprocessed.image ? (
          <FrameNote>Citra preprocessing belum tersedia.</FrameNote>
        ) : null}
        {main && overlayMode && !overlay ? (
          <FrameNote>{mode === "gradcam" ? "Memuat heatmap Grad-CAM..." : "Memuat mask ROI..."}</FrameNote>
        ) : null}
      </div>
    )
  }

  return (
    <section
      aria-label="Penampil citra USG"
      className="flex min-h-0 flex-col overflow-hidden rounded-xl bg-viewer text-white"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-white/10 px-3 py-2">
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(v) => v && setMode(v as ViewerMode)}
          aria-label="Mode citra"
          className="rounded-lg bg-white/5 p-0.5"
        >
          {modes.map((m) => (
            <ToggleGroupItem
              key={m.value}
              value={m.value}
              size="sm"
              className="h-7 px-2.5 text-[13px] text-white/70 hover:bg-white/10 hover:text-white data-[state=on]:bg-white/15 data-[state=on]:text-white"
            >
              {m.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <label className={cn("flex items-center gap-2 text-xs text-white/70", !overlayMode && "opacity-40")}>
          Opasitas
          <Slider
            value={[Math.round(opacity * 100)]}
            onValueChange={([v]) => setOpacity(v / 100)}
            min={0}
            max={100}
            step={5}
            disabled={!overlayMode}
            aria-label="Opasitas overlay"
            className="w-24"
          />
          <span className="tabular w-9 text-white/90">{Math.round(opacity * 100)}%</span>
        </label>
      </div>

      <div ref={containerRef} className="relative min-h-0 flex-1">
        {ready ? (
          <>
            <div className="absolute inset-0 flex" style={{ gap: FRAME_GAP }}>
              {compare ? renderFrame("original", false) : null}
              {renderFrame(mode, true)}
            </div>
            <div className="absolute right-3 bottom-3 flex items-center gap-0.5 rounded-lg bg-black/70 p-1 backdrop-blur-sm">
              <IconButton label="Bandingkan berdampingan" onClick={changeCompare} active={compare}>
                <Columns2Icon />
              </IconButton>
              <span className="mx-0.5 h-5 w-px bg-white/15" aria-hidden="true" />
              <IconButton label="Perkecil" onClick={() => zoomAt(1 / 1.25, { x: frameW / 2, y: frameH / 2 })}>
                <ZoomOutIcon />
              </IconButton>
              <span className="tabular w-11 text-center text-xs text-white/80">{zoomPercent}%</span>
              <IconButton label="Perbesar" onClick={() => zoomAt(1.25, { x: frameW / 2, y: frameH / 2 })}>
                <ZoomInIcon />
              </IconButton>
              <IconButton label="Reset tampilan" onClick={() => setView(null)} disabled={view === null}>
                <RotateCcwIcon />
              </IconButton>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center text-sm text-white/70">
            {original.status === "error" ? (
              <span className="flex items-center gap-2">
                <TriangleAlertIcon className="size-4 text-benign" aria-hidden="true" />
                Citra gagal dimuat. Muat ulang halaman.
              </span>
            ) : (
              <span className="flex items-center gap-2" role="status">
                <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
                Memuat citra...
              </span>
            )}
          </div>
        )}
      </div>

      <div
        role="toolbar"
        aria-label="Alat anotasi"
        className="flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-white/10 px-3 py-2"
      >
        <div className="flex items-center gap-0.5 rounded-lg bg-white/5 p-0.5">
          <IconButton label="Geser" onClick={() => setTool("pan")} active={tool === "pan"}>
            <HandIcon />
          </IconButton>
          <IconButton label="Kuas (B)" onClick={() => setTool("brush")} active={tool === "brush"} disabled={!canAnnotate}>
            <BrushIcon />
          </IconButton>
          <IconButton
            label="Penghapus (E)"
            onClick={() => setTool("erase")}
            active={tool === "erase"}
            disabled={!canAnnotate}
          >
            <EraserIcon />
          </IconButton>
        </div>

        <div role="radiogroup" aria-label="Tingkat kecurigaan" className="flex items-center gap-0.5">
          {annotationLevels.map((l) => (
            <button
              key={l.value}
              type="button"
              role="radio"
              aria-checked={level === l.value}
              data-active={level === l.value && tool === "brush"}
              onClick={() => chooseLevel(l.value)}
              disabled={!canAnnotate}
              className={darkButton}
            >
              <span className="size-2.5 rounded-full" style={{ background: l.color }} aria-hidden="true" />
              {l.label}
            </button>
          ))}
        </div>

        <label className={cn("flex items-center gap-2 text-xs text-white/70", !canAnnotate && "opacity-40")}>
          Ukuran
          <Slider
            value={[brushSize]}
            onValueChange={([v]) => setBrushSize(v)}
            min={4}
            max={48}
            step={2}
            disabled={!canAnnotate}
            aria-label="Ukuran kuas"
            className="w-16"
          />
        </label>

        <span className="flex-1" />
        <IconButton label="Batalkan goresan (Ctrl+Z)" onClick={undo} disabled={undoCount === 0}>
          <Undo2Icon />
        </IconButton>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-white/10 px-3 py-1.5 text-[11px] text-white/55">
        <span>
          Scroll untuk zoom · <Kbd>1</Kbd>
          <Kbd>2</Kbd>
          <Kbd>3</Kbd> kelas · <Kbd>B</Kbd> kuas · <Kbd>E</Kbd> hapus · <Kbd>O</Kbd> overlay · <Kbd>Ctrl+Z</Kbd>
        </span>
        {annotationLocked ? (
          <span className="text-benign">Anotasi tersimpan gagal dimuat, alat anotasi dikunci.</span>
        ) : img ? (
          <span className="tabular">
            {img.naturalWidth}x{img.naturalHeight} px
          </span>
        ) : null}
      </div>
    </section>
  )
}

function FrameNote({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white/80">
      {children}
    </span>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mx-0.5 rounded border border-white/20 bg-white/10 px-1 font-mono text-[10px] text-white/80">
      {children}
    </kbd>
  )
}
