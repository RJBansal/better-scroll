import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { type ReelMeta, agentRuns, db, profiles } from "@my-better-t-app/db";
import { desc, eq } from "drizzle-orm";

import { fetchPexelsRealReels } from "./pexels";

const FALLBACK_REAL_REELS = 4;

const DEFAULT_DROP_RUN_ID = "d91f4642-2fc5-406d-841c-46e3c2aa0839";
const DEFAULT_DROP_DATE = "2026-05-23";
const DEFAULT_DROP_DURATION_SEC = 32;

const DEFAULT_DROP_REELS: ReelMeta[] = [
  {
    id: "reel_20260523_xml_prompts",
    videoUrl: `/runs/${DEFAULT_DROP_RUN_ID}/${DEFAULT_DROP_DATE}/reels/reel-20260523-xml-prompts-2026-05-23T22-24-11-209Z/reel.mp4`,
    caption: "Prompt structural efficiency with XML tags",
    sourceTitle: "Attention Is All You Need",
    sourceUrl: "https://arxiv.org/abs/1706.03762",
    durationSec: DEFAULT_DROP_DURATION_SEC,
    category: "Goal Motivation",
    source: "generated",
  },
  {
    id: "reel_20260523_starship_f12",
    videoUrl: `/runs/${DEFAULT_DROP_RUN_ID}/${DEFAULT_DROP_DATE}/reels/reel-20260523-starship-f12-2026-05-23T22-28-14-372Z/reel.mp4`,
    caption: "Starship Flight 12 structural upgrades and telemetry innovations",
    sourceTitle: "Scott Manley's Starship Flight 12 Video Breakdown",
    sourceUrl: "https://youtu.be/2kxanBYTAaY?si=Dgi2v5SlHA_mhvb9",
    durationSec: DEFAULT_DROP_DURATION_SEC,
    category: "Hobby News",
    source: "generated",
  },
  {
    id: "reel_20260523_mcp_security",
    videoUrl: `/runs/${DEFAULT_DROP_RUN_ID}/${DEFAULT_DROP_DATE}/reels/reel-20260523-mcp-security-2026-05-23T22-39-54-957Z/reel.mp4`,
    caption: "Zero-trust security and statelessness in Model Context Protocol",
    sourceTitle: "The 2026-07-28 MCP Specification Release Candidate",
    sourceUrl: "https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/",
    durationSec: DEFAULT_DROP_DURATION_SEC,
    category: "Exploratory Discovery",
    source: "generated",
  },
];

function getPublicRunsRoot(): string {
  const cwd = process.cwd();
  // Same resolution logic as the agent service: prefer monorepo root, fall back to apps/web cwd
  const fromRoot = resolve(cwd, "apps", "web", "public", "runs");
  if (existsSync(fromRoot) || existsSync(resolve(cwd, "apps", "web"))) {
    return fromRoot;
  }
  return resolve(cwd, "public", "runs");
}

function getDefaultDropReels(): ReelMeta[] {
  const runsRoot = getPublicRunsRoot();
  const firstReelPath = resolve(
    runsRoot,
    DEFAULT_DROP_REELS[0].videoUrl.replace(/^\/runs\//, ""),
  );
  if (!existsSync(firstReelPath)) return [];
  return DEFAULT_DROP_REELS;
}

async function getProfileSearchQueries(): Promise<string[]> {
  const profileRow = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, "default"))
    .limit(1);

  const profile = profileRow[0];
  let queries = profile
    ? [...new Set([...profile.goals, ...profile.hobbies])].filter((s) => s.length > 0)
    : [];
  if (queries.length === 0) {
    queries = ["interesting", "science", "nature"];
  }
  return queries;
}

function toPexelsReelMeta(
  r: Awaited<ReturnType<typeof fetchPexelsRealReels>>[number],
): ReelMeta {
  return {
    id: r.id,
    videoUrl: r.path,
    caption: r.caption,
    sourceTitle: r.sourceTitle,
    sourceUrl: r.sourceUrl,
    durationSec: r.durationSec,
    category: "Real Reel",
    source: "pexels",
  };
}

async function fetchPexelsReelMetas(maxReels: number): Promise<ReelMeta[]> {
  const queries = await getProfileSearchQueries();
  const pexelsResults = await fetchPexelsRealReels(queries, "", maxReels);
  return pexelsResults.map(toPexelsReelMeta);
}

function interleaveGeneratedAndPexels(generated: ReelMeta[], pexels: ReelMeta[]): ReelMeta[] {
  const interleaved: ReelMeta[] = [];
  for (let i = 0; i < generated.length; i++) {
    interleaved.push(generated[i]!);
    if (i < generated.length - 1 && pexels[i]) {
      interleaved.push(pexels[i]!);
    }
  }
  return interleaved;
}

async function fetchFallbackRealReels(): Promise<ReelMeta[]> {
  return fetchPexelsReelMetas(FALLBACK_REAL_REELS);
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

  // No agent runs yet — serve the curated default drop with Pexels between each generated reel
  const defaultDrop = getDefaultDropReels();
  if (defaultDrop.length > 0) {
    const pexelsCount = Math.max(0, defaultDrop.length - 1);
    const pexelsReels = pexelsCount > 0 ? await fetchPexelsReelMetas(pexelsCount) : [];
    return interleaveGeneratedAndPexels(defaultDrop, pexelsReels);
  }

  // Default drop assets missing — fall back to live Pexels real reels
  return fetchFallbackRealReels();
}
