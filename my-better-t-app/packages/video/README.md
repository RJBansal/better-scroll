# @my-better-t-app/video

Generates a cohesive 32-second vertical (9:16) video reel on any topic by:

1. **Planning** — Gemini 2.5 Flash researches the topic via Google Search grounding, then outputs a structured 4-segment storyboard as JSON (including sources and search queries used).
2. **Generating** — Four 8-second clips are produced in parallel with Veo 3.1 (`veo-3.1-generate-preview`), each carrying the shared style guide and seamless transition cues from the plan.
3. **Stitching** — `ffmpeg` concatenates the four clips into a single `reel.mp4` (stream-copy, with re-encode fallback).

## Prerequisites

| Requirement | Notes |
|---|---|
| `GEMINI_API_KEY` | Must have access to Gemini 2.5 Flash and Veo 3.1 |
| `ffmpeg` | Must be on `PATH` (`brew install ffmpeg` on macOS) |
| Bun | Package manager / runtime |

## Usage

```bash
# From the monorepo root:
cd packages/video
export GEMINI_API_KEY=your_key_here
bun run generate "Attention Is All You Need"
```

Or with a `.env` file at the repo root:

```
GEMINI_API_KEY=your_key_here
```

Then run:

```bash
bun run generate "The James Webb Space Telescope"
```

## Output

All files are written to `out/<topic-slug>-<timestamp>/`:

```
out/attention-is-all-you-need-2026-05-23T.../
  plan.json       # Full storyboard + grounding sources
  seg_0.mp4       # Segment 0: 0:00-0:08
  seg_1.mp4       # Segment 1: 0:08-0:16
  seg_2.mp4       # Segment 2: 0:16-0:24
  seg_3.mp4       # Segment 3: 0:24-0:32
  reel.mp4        # Final stitched 32-second reel
  concat_list.txt # ffmpeg concat list (intermediate)
```

`plan.json` contains the full `PlannerResult` including:
- Parsed `VideoPlan` (title, styleGuide, music, 4 segments)
- `sources[]` — deduplicated web sources from Google Search grounding
- `searchQueries[]` — exact queries Gemini issued during grounding
- `rawText` — raw Flash response for debugging

## Package API

```typescript
import { generateReel } from "@my-better-t-app/video";

const result = await generateReel({
  topic: "The Transformer Architecture",
  baseOutDir: "./out", // optional, defaults to ./out
});

console.log(result.reelPath);    // path to reel.mp4
console.log(result.planPath);    // path to plan.json
console.log(result.segmentPaths); // [seg_0.mp4, seg_1.mp4, ...]
```

## Architecture

```
topic
  └─ planner.ts  (Gemini 2.5 Flash + Google Search)
       └─ PlannerResult { plan, sources, searchQueries }
            └─ veo.ts  (4× parallel Veo 3.1 calls)
                 └─ seg_0..3.mp4
                      └─ stitch.ts  (ffmpeg concat)
                           └─ reel.mp4
```
