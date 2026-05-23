import { runDailyAgent } from "@my-better-t-app/agent"
import { DEFAULT_PROFILE_ID, agentRuns, db } from "@my-better-t-app/db"
import { eq } from "drizzle-orm"

import { listBookmarkUrls } from "./bookmarks"
import { ensureDefaultProfile, loadDefaultProfile } from "./profile"

const MAX_AGENT_REELS = 2

export async function runDailyAgentFromBookmarks(reels = MAX_AGENT_REELS) {
  const clampedReels = Math.min(reels, MAX_AGENT_REELS)
  const runId = crypto.randomUUID()
  const startedAt = Date.now()

  await ensureDefaultProfile()
  await db.insert(agentRuns).values({
    id: runId,
    profileId: DEFAULT_PROFILE_ID,
    status: "started",
    reels: null,
    startedAt,
  })

  try {
    const bookmarkUrls = await listBookmarkUrls()
    const profile = await loadDefaultProfile(bookmarkUrls)
    const result = await runDailyAgent({ profile, reels: clampedReels })
    const reelPaths = result.reels.map((reel) => reel.reelPath)

    await db
      .update(agentRuns)
      .set({
        status: "completed",
        outDir: result.outDir,
        readUpPath: result.readUpPath,
        seedsPath: result.seedsPath,
        reels: reelPaths,
        completedAt: Date.now(),
      })
      .where(eq(agentRuns.id, runId))

    return {
      runId,
      outDir: result.outDir,
      readUpPath: result.readUpPath,
      seedsPath: result.seedsPath,
      reels: reelPaths,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    await db
      .update(agentRuns)
      .set({
        status: "failed",
        error: message,
        completedAt: Date.now(),
      })
      .where(eq(agentRuns.id, runId))

    throw err
  }
}
