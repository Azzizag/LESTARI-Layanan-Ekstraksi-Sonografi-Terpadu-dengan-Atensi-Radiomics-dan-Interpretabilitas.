export { cn } from "cn"

// Inisial avatar tanpa gelar di depan, mis. "dr. Rahma Aulia" menjadi "RA".
export function initials(name: string) {
  const words = name
    .replace(/^(dr|drg|prof)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase()
}
