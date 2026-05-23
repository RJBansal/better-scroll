import { type ReelMeta, agentRuns, db, profiles } from "@my-better-t-app/db";
import { desc, eq } from "drizzle-orm";

import { fetchPexelsRealReels } from "./pexels";

const FALLBACK_REAL_REELS = 4;

async function fetchFallbackRealReels(): Promise<ReelMeta[]> {
  const profileRow = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, "default"))
    .limit(1);

  const profile = profileRow[0];
  if (!profile) return [];

  let queries = [...new Set([...profile.goals, ...profile.hobbies])].filter((s) => s.length > 0);
  if (queries.length === 0) {
    queries = ["interesting", "science", "nature"];
  }

  const pexelsResults = await fetchPexelsRealReels(queries, "", FALLBACK_REAL_REELS);

  return pexelsResults.map((r) => ({
    id: r.id,
    videoUrl: r.path,
    caption: r.caption,
    sourceTitle: r.sourceTitle,
    sourceUrl: r.sourceUrl,
    durationSec: r.durationSec,
    category: "Real Reel",
    source: "pexels",
  }));
}

export async function getLatestReels(): Promise<ReelMeta[]> {
  const rows = await db
    .select({ reels: agentRuns.reels })
    .from(agentRuns)
    .where(eq(agentRuns.status, "completed"))
    .orderBy(desc(agentRuns.completedAt))
    .limit(1);

  const reels = rows[0]?.reels;
  if (reels && reels.length > 0) return reels;

  // No agent runs yet — fall back to live Pexels real reels
  return fetchFallbackRealReels();
}
