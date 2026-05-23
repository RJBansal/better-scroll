"use client"

import Link from "next/link"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { EndOfDrop } from "@/components/feed/end-of-drop"
import { FeedOverlay } from "@/components/feed/feed-overlay"
import { ReelCanvas } from "@/components/feed/reel-canvas"
import type { Reel } from "@/lib/types"
import { orpc } from "@/utils/orpc"

function toReel(meta: {
  id: string
  videoUrl: string
  caption: string
  sourceTitle: string
  sourceUrl: string
  durationSec: number
  category: string
}): Reel {
  return {
    id: meta.id,
    videoUrl: meta.videoUrl,
    caption: meta.caption,
    category: meta.category,
    sourceTitle: meta.sourceTitle,
    sourceUrl: meta.sourceUrl,
    durationSec: meta.durationSec,
  }
}

export default function FeedPage() {
  const [muted, setMuted] = useState(true)
  const { data: reelMetas, isLoading } = useQuery(orpc.reels.latest.queryOptions())

  const reels: Reel[] = (reelMetas ?? []).map(toReel)

  if (isLoading) {
    return (
      <main className="grid h-svh w-svw place-items-center bg-background">
        <span className="inline-block size-5 animate-spin rounded-full border-2 border-foreground/30 border-t-foreground" />
      </main>
    )
  }

  if (reels.length === 0) {
    return (
      <main className="grid h-svh w-svw place-items-center bg-background px-6 text-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-xl font-semibold tracking-tight">No drop yet</p>
          <p className="max-w-[30ch] text-sm leading-relaxed text-muted-foreground">
            Head to settings, fill in your profile, and hit{" "}
            <strong className="text-foreground">Generate drop</strong> to create your first reel.
          </p>
          <Link
            href="/settings"
            className="mt-2 rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-80"
          >
            Go to settings
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="relative h-svh w-svw overflow-hidden bg-background">
      <FeedOverlay />
      <div className="no-scrollbar h-full w-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain">
        {reels.map((reel, index) => (
          <ReelCanvas
            key={reel.id}
            reel={reel}
            index={index}
            muted={muted}
            onToggleMuted={() => setMuted((v) => !v)}
          />
        ))}
        <EndOfDrop count={reels.length} />
      </div>
    </main>
  )
}
