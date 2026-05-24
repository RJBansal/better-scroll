import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { type ReelMeta, agentRuns, db, profiles } from "@my-better-t-app/db";
import { desc, eq } from "drizzle-orm";

import { fetchPexelsRealReels } from "./pexels";

const FALLBACK_REAL_REELS = 4;
const CURATED_BRAINROT_REELS_COUNT = 6;
const OUR_REEL_INSERT_INTERVAL = 2;

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

const CURATED_BRAINROT_REELS: ReelMeta[] = [
  {
    id: "curated_brainrot_very_funny_cats",
    videoUrl:
      "https://archive.org/download/150-lost-viral-junk-videos/Very%20Funny%20Cats%201.mp4",
    caption: "Cats doing NPC side quests for no reason",
    sourceTitle: "Very Funny Cats 1",
    sourceUrl: "https://archive.org/details/150-lost-viral-junk-videos",
    durationSec: 30,
    category: "Brainrot",
    source: "web",
  },

  {
    id: "curated_brainrot_tiktok_dance_compilation",
    videoUrl:
      "https://archive.org/download/viva-cut-video-1618413535894-hd/VivaCut_video_1618413535894_HD.mp4",
    caption: "TikTok dance break spawned in the feed",
    sourceTitle: "Tiktok Dance Compilation",
    sourceUrl: "https://archive.org/details/viva-cut-video-1618413535894-hd",
    durationSec: 30,
    category: "Brainrot",
    source: "web",
  },
  {
    id: "curated_brainrot_super_dance_megamix",
    videoUrl:
      "https://archive.org/download/super-dance-megamix/Super%20Dance%20Megamix%201.mp4",
    caption: "Dance floor NPC compilation unlocked",
    sourceTitle: "Super Dance Megamix 1",
    sourceUrl: "https://archive.org/details/super-dance-megamix",
    durationSec: 30,
    category: "Brainrot",
    source: "web",
  },
  {
    id: "curated_brainrot_super_dance_megamix_2",
    videoUrl:
      "https://archive.org/download/super-dance-megamix/Super%20Dance%20Megamix%204.%20Mix%201.mp4",
    caption: "More dance compilation energy for the dopamine scroll",
    sourceTitle: "Super Dance Megamix 4 Mix 1",
    sourceUrl: "https://archive.org/details/super-dance-megamix",
    durationSec: 30,
    category: "Brainrot",
    source: "web",
  },
  {
    id: "curated_brainrot_video_dance",
    videoUrl:
      "https://archive.org/download/mwf-323-video-dance/mwf-323-video-dance.mp4",
    caption: "Retro dance visuals for maximum scroll damage",
    sourceTitle: "Video Dance",
    sourceUrl: "https://archive.org/details/mwf-323-video-dance",
    durationSec: 30,
    category: "Brainrot",
    source: "web",
  },
  {
    id: "curated_brainrot_rhythm_dance",
    videoUrl:
      "https://archive.org/download/VIDEODANCE90Eiffel65BlueDaBaDeeVIDEOMUSICALI/Videodance%20%2790%20-%20Corona%20-%20The%20Rhythm%20Of%20The%20Night%20%28Live%20At%20Dance%20Machine%29.mp4",
    caption: "Rhythm of the Night but make it brainrot",
    sourceTitle: "Corona - The Rhythm Of The Night",
    sourceUrl: "https://archive.org/details/VIDEODANCE90Eiffel65BlueDaBaDeeVIDEOMUSICALI",
    durationSec: 30,
    category: "Brainrot",
    source: "web",
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

function getCuratedBrainrotReels(maxReels = CURATED_BRAINROT_REELS_COUNT): ReelMeta[] {
  return CURATED_BRAINROT_REELS.slice(0, maxReels);
}

function insertOurReelsAfterExternalReels(
  externalReels: ReelMeta[],
  ourReels: ReelMeta[],
  interval = OUR_REEL_INSERT_INTERVAL,
): ReelMeta[] {
  if (ourReels.length === 0) return externalReels;

  const orderedReels: ReelMeta[] = [];
  let ourReelIndex = 0;

  for (let i = 0; i < externalReels.length; i++) {
    orderedReels.push(externalReels[i]!);
    const shouldInsertOurReel = (i + 1) % interval === 0 && ourReelIndex < ourReels.length;

    if (shouldInsertOurReel) {
      orderedReels.push(ourReels[ourReelIndex]!);
      ourReelIndex++;
    }
  }

  return [...orderedReels, ...ourReels.slice(ourReelIndex)];
}

async function fetchFallbackRealReels(): Promise<ReelMeta[]> {
  const pexelsReels = await fetchPexelsReelMetas(FALLBACK_REAL_REELS);
  return [...getCuratedBrainrotReels(), ...pexelsReels];
}

export async function getLatestReels(): Promise<ReelMeta[]> {
  const rows = await db
    .select({ reels: agentRuns.reels })
    .from(agentRuns)
    .where(eq(agentRuns.status, "completed"))
    .orderBy(desc(agentRuns.completedAt))
    .limit(1);

  const reels = rows[0]?.reels;
  if (reels && reels.length > 0) {
    const externalReels = [...getCuratedBrainrotReels(), ...reels.filter((reel) => reel.source !== "generated")];
    const ourReels = reels.filter((reel) => reel.source === "generated");
    return insertOurReelsAfterExternalReels(externalReels, ourReels);
  }

  // No agent runs yet — serve the curated default drop with Pexels between each generated reel
  const defaultDrop = getDefaultDropReels();
  if (defaultDrop.length > 0) {
    const pexelsCount = Math.max(0, defaultDrop.length - 1);
    const pexelsReels = pexelsCount > 0 ? await fetchPexelsReelMetas(pexelsCount) : [];
    const externalReels = [...getCuratedBrainrotReels(), ...pexelsReels];
    return insertOurReelsAfterExternalReels(externalReels, defaultDrop);
  }

  // Default drop assets missing — fall back to live Pexels real reels
  return fetchFallbackRealReels();
}
