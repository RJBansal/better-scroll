# @my-better-t-app/agent

A personalized daily reel-generation agent. Given a user profile (goals, hobbies, YouTube history, bookmarks), it:

1. **Researches** — `antigravity-preview-05-2026` managed agent runs Google Search and synthesizes a "Daily Massive Read-Up" markdown document grounded in fresh 2026 information.
2. **Decouples** — A second managed-agent interaction extracts N "Reel Seeds" (structured narrative blueprints: hook, body points, CTA, tone, pacing, visual direction).
3. **Generates** — Each seed is fed into `@my-better-t-app/video`'s `generateReel({ seed })`, which plans a 4-segment 9:16 storyboard with `planReelFromSeed` (managed agent), generates 4 × 8s clips with Veo 3.1 lite (max 2 in parallel), and stitches them into a 32s `reel.mp4` via ffmpeg.

All three steps use the same `antigravity-preview-05-2026` managed agent via `runManagedAgent` from `@my-better-t-app/video`.

## Prerequisites

| Requirement | Notes |
|---|---|
| `GEMINI_API_KEY` | Must have access to `antigravity-preview-05-2026` managed agent and Veo 3.1 lite |
| `ffmpeg` | Must be on `PATH` (`brew install ffmpeg` on macOS) |
| Bun | Package manager / runtime |

## Usage

```bash
cd packages/agent
export GEMINI_API_KEY=your_key_here

# Uses profiles/sample.json, generates 2 reels
bun run daily

# Custom profile, 3 reels
bun run daily --profile ./my-profile.json --reels 3
```

## User Profile Format

```json
{
  "name": "Alex",
  "goals": ["Run a marathon in under 4 hours"],
  "hobbies": ["Distance running", "IoT / Maker projects"],
  "youtube_history": ["Knee injury recovery exercises for runners"],
  "bookmarks": ["https://example.com/running-tips"],
  "notes": "Currently in week 6 of marathon training."
}
```

See [`profiles/sample.json`](profiles/sample.json) for the full example.

## Output Layout

```
out/2026-05-23/
  read_up.md           # Daily Massive Read-Up (markdown)
  research.json        # Sources + search queries from researcher
  reel_seeds.json      # N Reel Seed objects
  summary.json         # High-level run summary
  reels/
    <reel-id>-<ts>/
      plan.json        # 4-segment storyboard + sources
      seg_0..3.mp4     # Individual 8s segments
      reel.mp4         # Final 32s stitched video
```

## Architecture

```
UserProfile
  └─ researcher.ts  (runManagedAgent → read_up.md + research.json)
       └─ decoupler.ts  (runManagedAgent → reel_seeds.json)
            └─ for each seed:
                 └─ generateReel({ seed })  [packages/video]
                      └─ planReelFromSeed  (runManagedAgent → 4-seg storyboard)
                           └─ 4x Veo 3.1 lite (max 2 parallel)
                                └─ ffmpeg concat → reel.mp4
```

## Package API

```typescript
import { runDailyAgent, loadProfile } from "@my-better-t-app/agent";

const profile = await loadProfile("./my-profile.json");
const result = await runDailyAgent({ profile, reels: 2 });

console.log(result.reels[0].reelPath); // path to first reel.mp4
```
