"use client"

import { useRef, useState } from "react"
import { FileUp, Loader2, X } from "lucide-react"

import { parseBookmarkHtml } from "@/lib/bookmark-parser"
import { useBookmarks } from "@/lib/storage"

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB
const SAMPLE_LIMIT = 8

const TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
})

export function BookmarkUpload() {
  const inputRef = useRef<HTMLInputElement>(null)
  const { bookmarks, save, clear, hydrated } = useBookmarks()
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFiles = async (files: FileList | null) => {
    setError(null)
    const file = files?.[0]
    if (!file) return
    if (!/\.html?$/i.test(file.name)) {
      setError("Expected an HTML bookmark export.")
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("File is larger than 25 MB.")
      return
    }

    setParsing(true)
    try {
      const text = await file.text()
      const parsed = parseBookmarkHtml(text)
      if (parsed.length === 0) {
        setError("No bookmarks found in this file.")
        return
      }
      save({
        count: parsed.length,
        uploadedAt: Date.now(),
        filename: file.name,
        sample: parsed.slice(0, SAMPLE_LIMIT),
      })
    } catch (err) {
      console.error(err)
      setError("Couldn't parse this file.")
    } finally {
      setParsing(false)
    }
  }

  if (!hydrated) {
    return <div className="h-32 animate-pulse rounded-md bg-muted/40" />
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept=".html,.htm,text/html"
        className="sr-only"
        onChange={(event) => handleFiles(event.target.files)}
      />

      {bookmarks.count > 0 ? (
        <div className="flex flex-col gap-3 rounded-md border border-border bg-card/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <div className="text-sm font-medium text-foreground">
                {bookmarks.count.toLocaleString()} bookmarks
              </div>
              <div className="text-xs text-muted-foreground">
                {bookmarks.filename}
                {bookmarks.uploadedAt
                  ? ` · uploaded ${TIME_FORMATTER.format(bookmarks.uploadedAt)}`
                  : null}
              </div>
            </div>
            <button
              type="button"
              onClick={clear}
              aria-label="Remove uploaded bookmarks"
              className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          {bookmarks.sample.length > 0 ? (
            <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
              {bookmarks.sample.slice(0, 4).map((bm) => (
                <li key={bm.url} className="truncate">
                  {bm.title}
                </li>
              ))}
              {bookmarks.count > 4 ? (
                <li className="text-foreground/40">
                  + {(bookmarks.count - 4).toLocaleString()} more
                </li>
              ) : null}
            </ul>
          ) : null}

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="self-start text-xs font-medium text-primary transition-colors hover:underline"
          >
            Replace file
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={parsing}
          className="flex flex-col items-start gap-2 rounded-md border border-dashed border-border bg-card/30 px-5 py-6 text-left transition-colors hover:border-foreground/30 hover:bg-card/50 disabled:cursor-progress disabled:opacity-70"
        >
          <div className="flex items-center gap-2 text-foreground">
            {parsing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileUp className="size-4" />
            )}
            <span className="text-sm font-medium">
              {parsing ? "Parsing\u2026" : "Upload bookmarks"}
            </span>
          </div>
          <p className="max-w-[42ch] text-xs leading-relaxed text-muted-foreground">
            Drop a Chrome, Firefox, Safari, or Edge bookmarks export
            (<span className="text-foreground/70">.html</span>). Parsed locally;
            nothing leaves your machine.
          </p>
        </button>
      )}

      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  )
}
