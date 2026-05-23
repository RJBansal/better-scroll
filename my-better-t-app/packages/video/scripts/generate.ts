#!/usr/bin/env bun
import { resolve } from "node:path";
import { generateReel } from "../src/index";

const topic = process.argv[2]?.trim();

if (!topic) {
  console.error('Usage: bun run generate "<topic>"');
  console.error('Example: bun run generate "Attention Is All You Need"');
  process.exit(1);
}

if (!process.env["GEMINI_API_KEY"]) {
  console.error("Error: GEMINI_API_KEY environment variable is not set.");
  console.error("Set it with: export GEMINI_API_KEY=your_key_here");
  process.exit(1);
}

const baseOutDir = resolve(new URL("../out", import.meta.url).pathname);

try {
  const result = await generateReel({ topic, baseOutDir });
  console.log("\nDone! Files written:");
  console.log(`  Plan:     ${result.planPath}`);
  for (const [i, p] of result.segmentPaths.entries()) {
    console.log(`  Segment ${i}: ${p}`);
  }
  console.log(`  Reel:     ${result.reelPath}`);
} catch (err) {
  console.error("\nPipeline failed:", err instanceof Error ? err.message : err);
  process.exit(1);
}
