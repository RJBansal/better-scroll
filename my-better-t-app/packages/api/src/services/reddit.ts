import { env } from "@my-better-t-app/env/server"

// ---------------------------------------------------------------------------
// Reddit API
// ---------------------------------------------------------------------------

interface RedditPost {
  data: {
    id: string
    title: string
    subreddit: string
    author: string
    permalink: string
    score: number
    over_18: boolean
    is_video: boolean
    url: string
    media?: {
      reddit_video?: {
        fallback_url: string
        dash_url: string
        hls_url: string
        width: number
        height: number
        duration: number
      }
    }
  }
}

async function getAccessToken(): Promise<string | null> {
  const clientId = env.REDDIT_CLIENT_ID
  const clientSecret = env.REDDIT_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  })

  if (!res.ok) {
    console.warn(`[reddit] OAuth failed: ${res.status}`)
    return null
  }

  const data = (await res.json()) as { access_token?: string }
  return data.access_token ?? null
}

async function fetchSubredditTop(
  subreddit: string,
  period: "day" | "week" | "month" = "week",
  limit = 25,
): Promise<RedditPost[]> {
  const token = await getAccessToken()
  const headers: Record<string, string> = {
    "User-Agent": env.REDDIT_USER_AGENT,
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const url = `https://www.reddit.com/r/${subreddit}/top.json?t=${period}&limit=${limit}`
  const res = await fetch(url, { headers })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Reddit API error ${res.status}: ${text}`)
  }

  const data = (await res.json()) as { data?: { children?: RedditPost[] } }
  return data.data?.children ?? []
}

function isPortraitPost(post: RedditPost): boolean {
  const rv = post.data.media?.reddit_video
  if (!rv) return false
  return rv.height > rv.width
}

// ---------------------------------------------------------------------------
// Curated knowledge subreddits mapped loosely to topics
// ---------------------------------------------------------------------------

const KNOWLEDGE_SUBREDDITS = [
  "Damnthatsinteresting",
  "interestingasfuck",
  "educationalgifs",
  "space",
  "physicsgifs",
  "chemicalreactiongifs",
  "NatureIsFuckingLit",
  "BeAmazed",
  "todayilearned",
]

export async function fetchRedditRealReels(
  _topics: string[],
  _outDir: string,
  maxReels = 2,
): Promise<
  {
    id: string
    /** Remote video URL (fallback MP4, video-only) */
    path: string
    caption: string
    sourceTitle: string
    sourceUrl: string
    durationSec: number
    width: number
    height: number
  }[]
> {
  const results: ReturnType<typeof fetchRedditRealReels> extends Promise<infer T> ? T : never = []

  // We cycle through subs; topics are used only for logging/attribution loosely.
  const subs = KNOWLEDGE_SUBREDDITS
  let subIndex = 0

  for (let fetched = 0; fetched < maxReels && subIndex < subs.length; subIndex++) {
    const sub = subs[subIndex]
    if (!sub) continue
    try {
      const posts = await fetchSubredditTop(sub, "week", 25)
      for (const post of posts) {
        if (fetched >= maxReels) break
        if (!post.data.is_video) continue
        if (post.data.over_18) continue
        if (post.data.score < 200) continue
        if (!isPortraitPost(post)) continue

        const rv = post.data.media!.reddit_video!
        if (rv.duration > 90 || rv.duration < 5) continue

        const safeId = `reddit-${post.data.id}`
        console.log(`[reddit] Streaming post ${post.data.id}`)

        results.push({
          id: safeId,
          path: rv.fallback_url,
          caption: post.data.title,
          sourceTitle: `r/${post.data.subreddit} — u/${post.data.author}`,
          sourceUrl: `https://www.reddit.com${post.data.permalink}`,
          durationSec: rv.duration,
          width: rv.width,
          height: rv.height,
        })
        fetched++
      }
    } catch (err) {
      console.error(`[reddit] r/${sub} failed:`, err instanceof Error ? err.message : err)
    }
  }

  console.log(`[reddit] Streamed ${results.length} real reels`)
  return results
}
