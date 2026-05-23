"use client"

import Link from "next/link"
import { Settings } from "lucide-react"

export function FeedOverlay() {
  return (
    <div className="pointer-events-none fixed right-5 top-5 z-30">
      <Link
        href="/settings"
        aria-label="Settings"
        className="pointer-events-auto grid size-10 place-items-center rounded-full bg-background/40 text-foreground/75 backdrop-blur-sm transition-colors hover:bg-background/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Settings className="size-4" />
      </Link>
    </div>
  )
}
