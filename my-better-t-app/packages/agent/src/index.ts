import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { type GenerateReelResult, type PlannerResult, generateReel } from "@my-better-t-app/video";
import { decoupleReels } from "./decoupler";
import { runResearcher } from "./researcher";
import type { ReelSeed, UserProfile } from "./types";

export type { UserProfile, ReelSeed, ResearchResult } from "./types";

export interface DailyAgentOptions {
  profile: UserProfile;
  /** Number of reel seeds to generate. Default: 2 */
  reels?: number;
  /** Total reel duration in seconds (must be divisible into 4 segments). Default: 32 */
  reelDurationSec?: number;
  /** Base directory for outputs. Default: ./out */
  baseOutDir?: string;
}

export interface ReelRunResult {
  generatedReel: GenerateReelResult;
  seed: ReelSeed;
  plannerResult: PlannerResult;
}

export interface DailyAgentResult {
  outDir: string;
  readUpPath: string;
  seedsPath: string;
  reels: ReelRunResult[];
}

export async function runDailyAgent(opts: DailyAgentOptions): Promise<DailyAgentResult> {
  const MAX_REELS = 2;
  const { profile, reels: reelCount = 2, reelDurationSec = 32, baseOutDir } = opts;
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

  // Step 3: Generate one reel per seed (sequential — each uses up to 2 parallel Veo calls internally)
  console.log("\n--- Phase 3: Video Generation ---");
  const reelsOutDir = join(outDir, "reels");
  await mkdir(reelsOutDir, { recursive: true });

  const reelResults: ReelRunResult[] = [];
  for (const [i, seed] of seeds.entries()) {
    console.log(`\n[agent] Generating reel ${i + 1}/${seeds.length}: ${seed.reel_id}`);
    try {
      const result = await generateReel({ seed, baseOutDir: reelsOutDir, reelDurationSec });

      // Read the saved plan.json to get the plannerResult (sources, etc.)
      let plannerResult: PlannerResult;
      try {
        const { readFile } = await import("node:fs/promises");
        const raw = await readFile(result.planPath, "utf8");
        plannerResult = JSON.parse(raw) as PlannerResult;
      } catch {
        plannerResult = { topic: seed.topic_focus, plan: result as never, sources: [], searchQueries: [], rawText: "" };
      }

      reelResults.push({ generatedReel: result, seed, plannerResult });
    } catch (err) {
      console.error(
        `[agent] Reel ${i + 1} (${seed.reel_id}) failed — skipping:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log("Daily Agent complete!");
  console.log(`Read-up: ${join(outDir, "read_up.md")}`);
  console.log(`Seeds:   ${join(outDir, "reel_seeds.json")}`);
  for (const [i, r] of reelResults.entries()) {
    console.log(`Reel ${i + 1}:  ${r.generatedReel.reelPath}`);
  }
  console.log(`${"=".repeat(50)}\n`);

  return {
    outDir,
    readUpPath: join(outDir, "read_up.md"),
    seedsPath: join(outDir, "reel_seeds.json"),
    reels: reelResults,
  };
}
