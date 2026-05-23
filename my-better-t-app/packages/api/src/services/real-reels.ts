import { env } from "@my-better-t-app/env/server"
import { fetchPexelsRealReels } from "./pexels"
import { fetchRedditRealReels } from "./reddit"

export interface RealReelResult {
  id: string
  /** Remote video URL */
  path: string
  caption: string
  sourceTitle: string
  sourceUrl: string
  durationSec: number
  width: number
  height: number
  source: "pexels" | "reddit"
}

export interface FetchRealReelsOptions {
  queries: string[]
  outDir: string
  maxPexels?: number
  maxReddit?: number
}

function validateEnv(maxPexels: number, maxReddit: number) {
  const missing: string[] = []
  if (maxPexels > 0 && !env.PEXELS_API_KEY) {
    missing.push("PEXELS_API_KEY")
  }
  if (maxReddit > 0 && (!env.REDDIT_CLIENT_ID || !env.REDDIT_CLIENT_SECRET)) {
    missing.push("REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET")
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing environment variables for real-reel fetch: ${missing.join(", ")}. ` +
      `Add them to packages/env/.env and restart the dev server.`,
    )
  }
}

export async function fetchRealReels(opts: FetchRealReelsOptions): Promise<RealReelResult[]> {
  const { queries, maxPexels = 1, maxReddit = 1 } = opts

  validateEnv(maxPexels, maxReddit)

  const results: RealReelResult[] = []

  // Run both fetches in parallel
  const [pexelsResults, redditResults] = await Promise.allSettled([
    fetchPexelsRealReels(queries, "", maxPexels),
    fetchRedditRealReels(queries, "", maxReddit),
  ])

  if (pexelsResults.status === "fulfilled") {
    for (const r of pexelsResults.value) {
      results.push({ ...r, source: "pexels" })
    }
  } else {
    console.error("[real-reels] Pexels fetch failed:", pexelsResults.reason)
  }

  if (redditResults.status === "fulfilled") {
    for (const r of redditResults.value) {
      results.push({ ...r, source: "reddit" })
    }
  } else {
    console.error("[real-reels] Reddit fetch failed:", redditResults.reason)
  }

  console.log(`[real-reels] Total real reels streamed: ${results.length}`)
  return results
}
