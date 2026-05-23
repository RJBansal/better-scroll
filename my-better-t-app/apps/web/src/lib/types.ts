export const SOURCE_TYPES = ["paper", "bookmark", "video", "pdf"] as const

export type SourceType = (typeof SOURCE_TYPES)[number]

export type Reel = {
  id: string
  videoUrl: string
  poster?: string
  caption: string
  category: string
  sourceTitle: string
  sourceUrl: string
  durationSec: number
}

export type ParsedBookmark = {
  title: string
  url: string
  addedAt?: number
  folder?: string
}

export type Preferences = {
  dailyReelCount: number
  dailyRealReelCount: number
  dropTime: string
  reelDurationSec: number
  reducedMotion: boolean
  enabledSources: Record<SourceType, boolean>
}

export const DEFAULT_PREFERENCES: Preferences = {
  dailyReelCount: 10,
  dailyRealReelCount: 2,
  dropTime: "06:00",
  reelDurationSec: 28,
  reducedMotion: false,
  enabledSources: {
    paper: true,
    bookmark: true,
    video: true,
    pdf: true,
  },
}

export const SOURCE_LABELS: Record<SourceType, string> = {
  paper: "Papers",
  bookmark: "Bookmarks",
  video: "Video",
  pdf: "PDFs",
}
