import { env } from "@my-better-t-app/env/server"

export interface PexelsVideo {
  id: number
  width: number
  height: number
  duration: number
  url: string
  video_files: {
    id: number
    quality: string
    file_type: string
    width: number
    height: number
    link: string
  }[]
  video_pictures: { picture: string }[]
  user: {
    id: number
    name: string
    url: string
  }
}

function pickBestPortraitFile(files: PexelsVideo["video_files"]) {
  const mp4s = files.filter((f) => f.file_type === "video/mp4" && f.height > f.width)
  if (mp4s.length === 0) return null
  const qualityOrder = ["hd", "sd", "hls"]
  mp4s.sort((a, b) => {
    const qa = qualityOrder.indexOf(a.quality)
    const qb = qualityOrder.indexOf(b.quality)
    if (qa !== qb) return qa - qb
    return b.height - a.height
  })
  return mp4s[0]
}

export async function searchPexelsPortraitVideos(
  query: string,
  perPage = 10,
): Promise<PexelsVideo[]> {
  const apiKey = env.PEXELS_API_KEY
  if (!apiKey) {
    console.warn("[pexels] PEXELS_API_KEY not set, skipping")
    return []
  }

  const url = new URL("https://api.pexels.com/videos/search")
  url.searchParams.set("query", query)
  url.searchParams.set("orientation", "portrait")
  url.searchParams.set("per_page", String(perPage))
  url.searchParams.set("size", "small")

  const res = await fetch(url.toString(), {
    headers: { Authorization: apiKey },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Pexels API error ${res.status}: ${text}`)
  }

  const data = (await res.json()) as { videos?: PexelsVideo[] }
  return data.videos ?? []
}

export interface PexelsRealReel {
  id: string
  /** Remote MP4 URL */
  path: string
  caption: string
  sourceTitle: string
  sourceUrl: string
  durationSec: number
  width: number
  height: number
}

export async function fetchPexelsRealReels(
  queries: string[],
  _outDir: string,
  maxReels = 2,
): Promise<PexelsRealReel[]> {
  const results: PexelsRealReel[] = []

  for (const query of queries) {
    if (results.length >= maxReels) break
    try {
      const videos = await searchPexelsPortraitVideos(query, 10)
      for (const video of videos) {
        if (results.length >= maxReels) break
        if (video.duration > 90 || video.duration < 5) continue

        const file = pickBestPortraitFile(video.video_files)
        if (!file) continue

        const safeId = `pexels-${video.id}`
        console.log(`[pexels] Streaming video ${video.id}`)

        results.push({
          id: safeId,
          path: file.link,
          caption: `${video.user.name} — ${query}`,
          sourceTitle: video.user.name,
          sourceUrl: video.url,
          durationSec: video.duration,
          width: file.width,
          height: file.height,
        })
      }
    } catch (err) {
      console.error(`[pexels] Query "${query}" failed:`, err instanceof Error ? err.message : err)
    }
  }

  console.log(`[pexels] Streamed ${results.length} real reels`)
  return results
}
