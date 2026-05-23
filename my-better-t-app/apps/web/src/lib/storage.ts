"use client"

import { useEffect, useState } from "react"

import { DEFAULT_PREFERENCES, type ParsedBookmark, type Preferences } from "./types"

const PREFS_KEY = "bs:preferences"
const BOOKMARKS_KEY = "bs:bookmarks"

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return { ...fallback, ...JSON.parse(raw) } as T
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore quota / serialization errors silently
  }
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setPrefs(read(PREFS_KEY, DEFAULT_PREFERENCES))
    setHydrated(true)
  }, [])

  const update = (patch: Partial<Preferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch }
      write(PREFS_KEY, next)
      return next
    })
  }

  return { prefs, update, hydrated }
}

export type StoredBookmarks = {
  count: number
  uploadedAt: number | null
  filename: string | null
  sample: ParsedBookmark[]
}

const EMPTY_BOOKMARKS: StoredBookmarks = {
  count: 0,
  uploadedAt: null,
  filename: null,
  sample: [],
}

export function useBookmarks() {
  const [state, setState] = useState<StoredBookmarks>(EMPTY_BOOKMARKS)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setState(read(BOOKMARKS_KEY, EMPTY_BOOKMARKS))
    setHydrated(true)
  }, [])

  const save = (next: StoredBookmarks) => {
    setState(next)
    write(BOOKMARKS_KEY, next)
  }

  const clear = () => save(EMPTY_BOOKMARKS)

  return { bookmarks: state, save, clear, hydrated }
}
