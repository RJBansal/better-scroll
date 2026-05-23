import { existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { runDailyAgent } from "@my-better-t-app/agent";
import { DEFAULT_PROFILE_ID, type ReelMeta, agentRuns, db } from "@my-better-t-app/db";
import { eq } from "drizzle-orm";

import { listBookmarkUrls } from "./bookmarks";
import { ensureDefaultProfile, loadDefaultProfile } from "./profile";
import { fetchRealReels, type RealReelResult } from "./real-reels";

const MAX_AGENT_REELS = 10;
const DEFAULT_REEL_DURATION_SEC = 32;
const MAX_REAL_REELS = 6;

function getPublicRunsRoot(): string {
  const cwd = process.cwd();
  // When running from repo root (common in monorepo dev), use apps/web/public/runs
  const fromRoot = resolve(cwd, "apps", "web", "public", "runs");
  if (existsSync(fromRoot) || existsSync(resolve(cwd, "apps", "web"))) {
    return fromRoot;
  }
  // When running from apps/web itself
  return resolve(cwd, "public", "runs");
}

function deriveSearchQueries(profile: Awaited<ReturnType<typeof loadDefaultProfile>>, result: Awaited<ReturnType<typeof runDailyAgent>>): string[] {
  const base = [...profile.goals, ...profile.hobbies];
  const fromReels = result.reels.map((r) => r.seed.topic_focus);
  return [...new Set([...base, ...fromReels])].filter((s) => s.length > 0);
}

export async function runDailyAgentFromBookmarks(
  reels = MAX_AGENT_REELS,
  reelDurationSec = DEFAULT_REEL_DURATION_SEC,
  realReels = 0,
) {
  const clampedReels = Math.min(reels, MAX_AGENT_REELS);
  const clampedDuration = Math.max(8, Math.min(reelDurationSec, 120));
  const clampedRealReels = Math.max(0, Math.min(realReels, MAX_REAL_REELS));
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
    const result = await runDailyAgent({
      profile,
      reels: clampedReels,
      reelDurationSec: clampedDuration,
      baseOutDir,
    });

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
        durationSec: clampedDuration,
        category: seed.category,
        source: "generated",
      };
    });

    let realReels: RealReelResult[] = [];
    if (clampedRealReels > 0) {
      console.log(`[agent] Fetching ${clampedRealReels} real reels…`);
      realReels = await fetchRealReels({
        queries: deriveSearchQueries(profile, result),
        outDir: result.outDir,
        maxPexels: clampedRealReels,
        maxReddit: 0,
      });
      console.log(`[agent] Real reels fetched: ${realReels.length}`);
    }

    const realReelMetas: ReelMeta[] = realReels.map((real) => {
      const videoUrl = real.path.startsWith("http")
        ? real.path
        : `/runs/${relative(publicRunsRoot, real.path).replace(/\\/g, "/")}`;
      return {
        id: real.id,
        videoUrl,
        caption: real.caption,
        sourceTitle: real.sourceTitle,
        sourceUrl: real.sourceUrl,
        durationSec: real.durationSec,
        category: "Real Reel",
        source: real.source,
      };
    });

    await db
      .update(agentRuns)
      .set({
        status: "completed",
        outDir: result.outDir,
        readUpPath: result.readUpPath,
        seedsPath: result.seedsPath,
        reels: [...reelMetas, ...realReelMetas],
        completedAt: Date.now(),
      })
      .where(eq(agentRuns.id, runId));

    return {
      runId,
      outDir: result.outDir,
      readUpPath: result.readUpPath,
      seedsPath: result.seedsPath,
      reels: result.reels.map((r) => r.generatedReel.reelPath),
      realReels: realReels.map((r) => r.path),
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
