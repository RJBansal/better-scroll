import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { type GenerateReelResult, generateReel } from "@my-better-t-app/video";
import { decoupleReels } from "./decoupler";
import { runResearcher } from "./researcher";
import type { UserProfile } from "./types";

export type { UserProfile, ReelSeed, ResearchResult } from "./types";
// Re-export for convenience
export { loadProfile } from "./profile";

export interface DailyAgentOptions {
  profile: UserProfile;
  /** Number of reel seeds to generate. Default: 2 */
  reels?: number;
  /** Base directory for outputs. Default: ./out */
  baseOutDir?: string;
}

export interface DailyAgentResult {
  outDir: string;
  readUpPath: string;
  seedsPath: string;
  reels: GenerateReelResult[];
}

export async function runDailyAgent(opts: DailyAgentOptions): Promise<DailyAgentResult> {
  const MAX_REELS = 2;
  const { profile, reels: reelCount = 2, baseOutDir } = opts;
  const clampedReelCount = Math.min(reelCount, MAX_REELS);

  const resolvedBase = resolve(baseOutDir ?? "./out");
  const datestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const outDir = join(resolvedBase, datestamp);
  await mkdir(outDir, { recursive: true });

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Daily Agent: ${profile.name}`);
  console.log(`Date: ${datestamp}`);
  console.log(`Output: ${outDir}`);
  console.log(`Reels: ${clampedReelCount}${reelCount > MAX_REELS ? ` (capped from ${reelCount})` : ""}`);
  console.log(`${"=".repeat(50)}\n`);

  // Step 1: Research
  console.log("--- Phase 1: Research ---");
  const research = await runResearcher(profile, outDir);

  // Step 2: Decouple into seeds
  console.log("\n--- Phase 2: Reel Seed Extraction ---");
  const seeds = await decoupleReels(profile, research.readUpMarkdown, clampedReelCount, outDir);

  // Write combined summary before video generation starts
  await writeFile(
    join(outDir, "summary.json"),
    JSON.stringify(
      {
        profile: profile.name,
        date: datestamp,
        sources: research.sources,
        searchQueries: research.searchQueries,
        seeds: seeds.map((s) => ({ reel_id: s.reel_id, category: s.category, topic_focus: s.topic_focus })),
      },
      null,
      2,
    ),
    "utf8",
  );

  // Step 3: Generate one reel per seed (sequential — each reel uses up to 2 parallel Veo calls internally)
  console.log("\n--- Phase 3: Video Generation ---");
  const reelsOutDir = join(outDir, "reels");
  await mkdir(reelsOutDir, { recursive: true });

  const reelResults: GenerateReelResult[] = [];
  for (const [i, seed] of seeds.entries()) {
    console.log(`\n[agent] Generating reel ${i + 1}/${seeds.length}: ${seed.reel_id}`);
    const result = await generateReel({ seed, baseOutDir: reelsOutDir });
    reelResults.push(result);
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log("Daily Agent complete!");
  console.log(`Read-up: ${join(outDir, "read_up.md")}`);
  console.log(`Seeds:   ${join(outDir, "reel_seeds.json")}`);
  for (const [i, r] of reelResults.entries()) {
    console.log(`Reel ${i + 1}:  ${r.reelPath}`);
  }
  console.log(`${"=".repeat(50)}\n`);

  return {
    outDir,
    readUpPath: join(outDir, "read_up.md"),
    seedsPath: join(outDir, "reel_seeds.json"),
    reels: reelResults,
  };
}
