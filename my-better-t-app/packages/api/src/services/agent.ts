import { join, relative, resolve } from "node:path";
import { runDailyAgent } from "@my-better-t-app/agent";
import { DEFAULT_PROFILE_ID, type ReelMeta, agentRuns, db } from "@my-better-t-app/db";
import { eq } from "drizzle-orm";

import { listBookmarkUrls } from "./bookmarks";
import { ensureDefaultProfile, loadDefaultProfile } from "./profile";

const MAX_AGENT_REELS = 2;

function getPublicRunsRoot(): string {
  // At Next.js runtime, process.cwd() is apps/web
  return resolve(process.cwd(), "public", "runs");
}

export async function runDailyAgentFromBookmarks(reels = MAX_AGENT_REELS) {
  const clampedReels = Math.min(reels, MAX_AGENT_REELS);
  const runId = crypto.randomUUID();
  const startedAt = Date.now();
  const publicRunsRoot = getPublicRunsRoot();
  const baseOutDir = join(publicRunsRoot, runId);

  await ensureDefaultProfile();
  await db.insert(agentRuns).values({
    id: runId,
    profileId: DEFAULT_PROFILE_ID,
    status: "started",
    reels: null,
    startedAt,
  });

  try {
    const bookmarkUrls = await listBookmarkUrls();
    const profile = await loadDefaultProfile(bookmarkUrls);
    const result = await runDailyAgent({ profile, reels: clampedReels, baseOutDir });

    if (result.reels.length === 0) {
      throw new Error("All reels failed to generate. Check server logs for per-reel errors.");
    }

    const reelMetas: ReelMeta[] = result.reels.map((reelRun) => {
      const { generatedReel, seed, plannerResult } = reelRun;
      const relPath = relative(publicRunsRoot, generatedReel.reelPath).replace(/\\/g, "/");
      const firstSource = plannerResult.sources?.[0];
      return {
        id: seed.reel_id,
        videoUrl: `/runs/${relPath}`,
        caption: seed.topic_focus,
        sourceTitle: firstSource?.title ?? seed.metadata.source_references[0] ?? "",
        sourceUrl: firstSource?.uri ?? "",
        durationSec: 32,
        category: seed.category,
      };
    });

    await db
      .update(agentRuns)
      .set({
        status: "completed",
        outDir: result.outDir,
        readUpPath: result.readUpPath,
        seedsPath: result.seedsPath,
        reels: reelMetas,
        completedAt: Date.now(),
      })
      .where(eq(agentRuns.id, runId));

    return {
      runId,
      outDir: result.outDir,
      readUpPath: result.readUpPath,
      seedsPath: result.seedsPath,
      reels: result.reels.map((r) => r.generatedReel.reelPath),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    await db
      .update(agentRuns)
      .set({
        status: "failed",
        error: message,
        completedAt: Date.now(),
      })
      .where(eq(agentRuns.id, runId));

    throw err;
  }
}
