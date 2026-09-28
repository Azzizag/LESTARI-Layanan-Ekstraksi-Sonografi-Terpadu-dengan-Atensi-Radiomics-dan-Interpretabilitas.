// Format tanggal dan waktu untuk UI. Semua perhitungan hari memakai zona Asia/Jakarta
// agar hasil sama di server (Vercel, UTC) dan di browser faskes.

export const APP_TIME_ZONE = "Asia/Jakarta"
const JAKARTA_OFFSET = "+07:00"

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})
const timeFormat = new Intl.DateTimeFormat("id-ID", {
  timeZone: APP_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
})
const dateFormat = new Intl.DateTimeFormat("id-ID", {
  timeZone: APP_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
})
const weekdayFormat = new Intl.DateTimeFormat("id-ID", { timeZone: APP_TIME_ZONE, weekday: "short" })

// "2026-09-28" untuk tanggal di zona Jakarta.
export function dayKey(date: Date | string) {
  return dayKeyFormat.format(new Date(date))
}

// Awal hari (00.00 WIB) untuk tanggal tertentu, digeser `offsetDays` hari.
export function startOfDay(date: Date, offsetDays = 0) {
  const start = new Date(`${dayKey(date)}T00:00:00${JAKARTA_OFFSET}`)
  start.setUTCDate(start.getUTCDate() + offsetDays)
  return start
}

// "Sen", "Sel", ... untuk label sumbu grafik.
export function weekdayShort(date: Date) {
  return weekdayFormat.format(date).replace(".", "")
}

export function formatDate(date: Date | string) {
  return dateFormat.format(new Date(date))
}

// "Baru saja", "5 menit lalu", "3 jam lalu", "Kemarin 15.42", atau "12 Sep 2026".
export function formatRelative(date: Date | string, now = new Date()) {
  const then = new Date(date)
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000)
  if (minutes < 1) return "Baru saja"
  if (minutes < 60) return `${minutes} menit lalu`
  if (dayKey(then) === dayKey(now)) return `${Math.floor(minutes / 60)} jam lalu`
  if (dayKey(then) === dayKey(startOfDay(now, -1))) return `Kemarin ${timeFormat.format(then)}`
  return dateFormat.format(then)
}

// Untuk dipakai di tengah kalimat, mis. "Diunggah baru saja".
export function formatRelativeInline(date: Date | string, now = new Date()) {
  const label = formatRelative(date, now)
  return label.charAt(0).toLowerCase() + label.slice(1)
}

// Usia dalam tahun dari tanggal lahir "YYYY-MM-DD".
export function ageFromBirthDate(birthDate: string | null, now = new Date()) {
  if (!birthDate) return null
  const [by, bm, bd] = birthDate.split("-").map(Number)
  const [ny, nm, nd] = dayKey(now).split("-").map(Number)
  return ny - by - (nm < bm || (nm === bm && nd < bd) ? 1 : 0)
}

// Angka paper ditulis persis 2 desimal dengan koma (docs/METODOLOGI.md), mis. 92.36 -> "92,36%".
const paperDecimal = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const integerFormat = new Intl.NumberFormat("id-ID")

export const formatPaperPercent = (value: number) => `${paperDecimal.format(value)}%`
export const formatPaperMs = (value: number) => `${paperDecimal.format(value)} ms`
export const formatPoints = (value: number) => `${value > 0 ? "+" : ""}${paperDecimal.format(value)} pp`
export const formatInteger = (value: number) => integerFormat.format(value)

const dateTimeFormat = new Intl.DateTimeFormat("id-ID", {
  timeZone: APP_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

// "28 Sep 2026 pukul 16.42 WIB" untuk dokumen (laporan PDF).
export const formatDateTime = (date: Date | string) => `${dateTimeFormat.format(new Date(date))} WIB`
