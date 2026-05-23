import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { planReel } from "./planner.js";
import { stitch } from "./stitch.js";
import { generateAllSegments } from "./veo.js";

export type { PlannerResult, VideoPlan, VideoSegment, Source } from "./types.js";

export interface GenerateReelOptions {
  topic: string;
  /** Absolute or relative path where outputs are written. Defaults to `./out` */
  baseOutDir?: string;
}

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
  const { topic, baseOutDir = "./out" } = opts;

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = join(baseOutDir, `${slugify(topic)}-${timestamp}`);
  await mkdir(outDir, { recursive: true });

  console.log(`\n=== Video Reel Pipeline ===`);
  console.log(`Topic: ${topic}`);
  console.log(`Output directory: ${outDir}\n`);

  // Step 1: Plan
  const plannerResult = await planReel(topic);
  const planPath = join(outDir, "plan.json");
  await writeFile(planPath, JSON.stringify(plannerResult, null, 2), "utf8");
  console.log(`\n[pipeline] Plan saved to ${planPath}`);
  console.log(`[pipeline] Sources (${plannerResult.sources.length}):`);
  for (const s of plannerResult.sources) {
    console.log(`  - ${s.title}: ${s.uri}`);
  }

  // Step 2: Generate segments in parallel
  console.log("\n[pipeline] Generating 4 video segments in parallel…");
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
