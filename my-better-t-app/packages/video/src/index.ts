import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { planReel, planReelFromSeed } from "./planner";
import { stitch } from "./stitch";
import { generateAllSegments } from "./veo";

export type { PlannerResult, VideoPlan, VideoSegment, Source, ReelSeedInput } from "./types";
export { extractJson } from "./types";
export { runManagedAgent } from "./managedAgent";
export type { ManagedAgentRunInput, ManagedAgentResult } from "./managedAgent";

export type GenerateReelOptions =
  | { topic: string; baseOutDir?: string }
  | { seed: import("./types").ReelSeedInput; baseOutDir?: string };

export interface GenerateReelResult {
  planPath: string;
  segmentPaths: string[];
  reelPath: string;
  outDir: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export async function generateReel(opts: GenerateReelOptions): Promise<GenerateReelResult> {
  const baseOutDir = opts.baseOutDir ?? "./out";

  const isSeed = "seed" in opts;
  const label = isSeed
    ? (opts.seed.reel_id ?? opts.seed.topic_focus)
    : opts.topic;

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = join(baseOutDir, `${slugify(label)}-${timestamp}`);
  await mkdir(outDir, { recursive: true });

  console.log(`\n=== Video Reel Pipeline ===`);
  console.log(`Label: ${label}`);
  console.log(`Output directory: ${outDir}\n`);

  // Step 1: Plan
  const plannerResult = isSeed
    ? await planReelFromSeed(opts.seed)
    : await planReel(opts.topic);

  const planPath = join(outDir, "plan.json");
  await writeFile(planPath, JSON.stringify(plannerResult, null, 2), "utf8");
  console.log(`\n[pipeline] Plan saved to ${planPath}`);
  console.log(`[pipeline] Sources (${plannerResult.sources.length}):`);
  for (const s of plannerResult.sources) {
    console.log(`  - ${s.title}: ${s.uri}`);
  }

  // Step 2: Generate segments in parallel (max 2 at a time)
  console.log("\n[pipeline] Generating 4 video segments…");
  const segmentPaths = await generateAllSegments(plannerResult.plan, outDir);
  console.log("[pipeline] All segments downloaded.");

  // Step 3: Stitch
  const reelPath = join(outDir, "reel.mp4");
  console.log("\n[pipeline] Stitching segments…");
  await stitch(segmentPaths, reelPath);

  console.log(`\n=== Complete ===`);
  console.log(`Reel: ${reelPath}`);
  console.log(`Plan: ${planPath}`);

  return { planPath, segmentPaths, reelPath, outDir };
}
