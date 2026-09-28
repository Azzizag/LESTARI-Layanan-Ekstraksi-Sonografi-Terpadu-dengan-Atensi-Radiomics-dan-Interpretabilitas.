"use client"

import { useEffect, useRef } from "react"

import { useSidebar } from "@/components/ui/sidebar"

// Penanda bahwa sidebar diciutkan otomatis oleh konsol review, bukan oleh pengguna. Disimpan di
// sessionStorage karena status sidebar shadcn disimpan di cookie dan bertahan saat halaman dimuat ulang.
const RESTORE_KEY = "lestari:sidebar-restore"
const REVIEW_PREFIX = "/dokter/review/"

function readFlag() {
  try {
    return sessionStorage.getItem(RESTORE_KEY) === "1"
  } catch {
    return false
  }
}

function writeFlag(value: boolean) {
  try {
    if (value) sessionStorage.setItem(RESTORE_KEY, "1")
    else sessionStorage.removeItem(RESTORE_KEY)
  } catch {
    // Penyimpanan diblokir browser: sidebar tetap berfungsi, hanya tidak dikembalikan otomatis.
  }
}

// Konsol review butuh lebar penuh untuk viewer (1366 px), jadi sidebar diciutkan saat konsol dibuka.
export function CollapseSidebar() {
  const { open, setOpen } = useSidebar()
  const initiallyOpen = useRef(open)
  const setOpenRef = useRef(setOpen)

  useEffect(() => {
    setOpenRef.current = setOpen
  }, [setOpen])

  useEffect(() => {
    if (!initiallyOpen.current) return
    writeFlag(true)
    setOpenRef.current(false)
  }, [])

  return null
}

// Dipakai AppSidebar (selalu ter-mount): di luar konsol review, sidebar yang diciutkan otomatis
// dibuka kembali, termasuk setelah navigasi penuh atau muat ulang halaman.
export function useRestoreSidebar(pathname: string) {
  const { setOpen } = useSidebar()
  useEffect(() => {
    if (pathname.startsWith(REVIEW_PREFIX) || !readFlag()) return
    writeFlag(false)
    setOpen(true)
  }, [pathname, setOpen])
}
