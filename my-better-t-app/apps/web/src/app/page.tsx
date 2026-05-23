"use client"

import { useState } from "react"

import { EndOfDrop } from "@/components/feed/end-of-drop"
import { FeedOverlay } from "@/components/feed/feed-overlay"
import { ReelCanvas } from "@/components/feed/reel-canvas"
import { MOCK_REELS } from "@/lib/mock-reels"
import { usePreferences } from "@/lib/storage"

export default function FeedPage() {
  const [muted, setMuted] = useState(true)
  const { prefs } = usePreferences()

  const enabled = MOCK_REELS.filter((reel) => prefs.enabledSources[reel.sourceType])
  const reels = enabled.slice(0, prefs.dailyReelCount)

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
