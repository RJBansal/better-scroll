#!/usr/bin/env bun
import "@my-better-t-app/env/server"
import { resolve } from "node:path"
import { loadProfile, runDailyAgent } from "../src/index"

function parseArgs(): { profilePath?: string; reels: number } {
  const args = process.argv.slice(2)
  let profilePath: string | undefined
  let reels = 2

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if ((arg === "--profile" || arg === "-p") && args[i + 1]) {
      profilePath = resolve(args[++i] ?? "")
    } else if ((arg === "--reels" || arg === "-n") && args[i + 1]) {
      const parsed = parseInt(args[++i] ?? "2", 10)
      if (!isNaN(parsed) && parsed > 0) reels = parsed
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Usage: bun run daily [options]

Options:
  --profile, -p <path>   Path to user profile JSON (default: profiles/sample.json)
  --reels,   -n <count>  Number of reel seeds to generate (default: 2)
  --help,    -h          Show this help message

Example:
  bun run daily
  bun run daily --profile ./my-profile.json --reels 3
      `.trim())
      process.exit(0)
    }
  }

  return { profilePath, reels }
}

if (!process.env["GEMINI_API_KEY"]) {
  console.error("Error: GEMINI_API_KEY environment variable is not set.")
  console.error("  export GEMINI_API_KEY=your_key_here")
  process.exit(1)
}

const { profilePath, reels } = parseArgs()
const baseOutDir = resolve(new URL("../out", import.meta.url).pathname)

try {
  const profile = await loadProfile(profilePath)
  console.log(`Loaded profile: ${profile.name}`)

  const result = await runDailyAgent({ profile, reels, baseOutDir })

  console.log("\nSummary:")
  console.log(`  Output dir: ${result.outDir}`)
  console.log(`  Read-up:    ${result.readUpPath}`)
  console.log(`  Seeds:      ${result.seedsPath}`)
  for (const [i, r] of result.reels.entries()) {
    console.log(`  Reel ${i + 1}:     ${r.reelPath}`)
  }
} catch (err) {
  console.error("\nDaily agent failed:", err instanceof Error ? err.message : err)
  process.exit(1)
}
