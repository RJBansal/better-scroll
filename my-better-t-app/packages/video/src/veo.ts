import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { GoogleGenAI } from "@google/genai";
import type { VideoPlan, VideoSegment } from "./types";

const POLL_INTERVAL_MS = 10_000;
const MAX_RETRIES = 2;
const MAX_PARALLEL = 2;

// ---------------------------------------------------------------------------
// Rate limiter: at most 10 Veo requests per 60-second window
// ---------------------------------------------------------------------------
const RATE_LIMIT_RPM = 10;
const RATE_WINDOW_MS = 60_000;
const requestTimestamps: number[] = [];

async function acquireRateLimit(): Promise<void> {
  while (true) {
    const now = Date.now();
    // Drop timestamps older than the rolling 60-second window
    while (requestTimestamps.length > 0 && now - requestTimestamps[0]! > RATE_WINDOW_MS) {
      requestTimestamps.shift();
    }
    if (requestTimestamps.length < RATE_LIMIT_RPM) {
      requestTimestamps.push(now);
      return;
    }
    // Wait until the oldest request falls out of the window
    const waitMs = RATE_WINDOW_MS - (now - requestTimestamps[0]!) + 10;
    console.log(`[veo] Rate limit reached (${RATE_LIMIT_RPM} rpm), waiting ${Math.ceil(waitMs / 1000)}s…`);
    await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
  }
}

function buildSegmentPrompt(plan: VideoPlan, seg: VideoSegment): string {
  const prevSeg = seg.index > 0 ? plan.segments[seg.index - 1] : null;
  const nextSeg = seg.index < 3 ? plan.segments[seg.index + 1] : null;

  return `[Shared style guide]
${plan.styleGuide}
Music: ${plan.music}

[Segment ${seg.index + 1} of 4 — ${seg.timeRange} of a stitched 32s 9:16 reel titled "${plan.title}"]
Open the shot on: ${seg.transitionInCue}
End the shot on: ${seg.transitionOutCue}

Visual: ${seg.visual}
On-screen text overlay (top-center, bold sans-serif, white with drop shadow): "${seg.onScreenText}"
Narrator voiceover (calm, clear, ~2 words/sec): "${seg.voiceover}"
${prevSeg ? `\nPreceding segment ended on: ${prevSeg.transitionOutCue}` : ""}
${nextSeg ? `Following segment opens on: ${nextSeg.transitionInCue}` : ""}

Keep camera movement, color palette, lens characteristics, and color grade identical to adjacent segments so all four clips stitch together seamlessly into one continuous 32-second video.`.trim();
}

async function downloadVideo(uri: string, apiKey: string): Promise<Buffer> {
  const url = `${uri}&key=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function generateSegmentWithRetry(
  ai: GoogleGenAI,
  apiKey: string,
  plan: VideoPlan,
  segIndex: number,
  outDir: string,
  attempt = 0,
  segmentDurationSec = 8,
): Promise<string> {
  const seg = plan.segments[segIndex];
  if (!seg) throw new Error(`Invalid segment index: ${segIndex}`);

  const prompt = buildSegmentPrompt(plan, seg);
  console.log(`[veo] Starting segment ${segIndex} generation (attempt ${attempt + 1})…`);

  await acquireRateLimit();
  let operation = await ai.models.generateVideos({
    model: "veo-3.1-lite-generate-preview",
    source: { prompt },
    config: {
      numberOfVideos: 1,
      aspectRatio: "9:16",
      resolution: "720p",
      durationSeconds: segmentDurationSec,
    },
  });

  while (!operation.done) {
    console.log(`[veo] Segment ${segIndex} still generating, checking again in ${POLL_INTERVAL_MS / 1000}s…`);
    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  const generatedVideos = operation.response?.generatedVideos;
  if (!generatedVideos?.length) {
    throw new Error(`Veo returned no videos for segment ${segIndex}`);
  }

  const videoUri = generatedVideos[0]?.video?.uri;
  if (!videoUri) throw new Error(`No URI for segment ${segIndex}`);

  console.log(`[veo] Segment ${segIndex} ready, downloading from ${videoUri}…`);
  const buffer = await downloadVideo(videoUri, apiKey);

  const outPath = join(outDir, `seg_${segIndex}.mp4`);
  await writeFile(outPath, buffer);
  console.log(`[veo] Segment ${segIndex} saved to ${outPath}`);
  return outPath;
}

async function withSegmentRetry(
  ai: GoogleGenAI,
  apiKey: string,
  plan: VideoPlan,
  i: 0 | 1 | 2 | 3,
  outDir: string,
  segmentDurationSec: number,
): Promise<string> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await generateSegmentWithRetry(ai, apiKey, plan, i, outDir, attempt, segmentDurationSec);
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      console.warn(`[veo] Segment ${i} attempt ${attempt + 1} failed, retrying…`, err);
    }
  }
  throw new Error(`Segment ${i} failed after ${MAX_RETRIES + 1} attempts`);
}

export async function generateAllSegments(
  plan: VideoPlan,
  outDir: string,
  segmentDurationSec = 8,
): Promise<string[]> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) throw new Error("GEMINI_API_KEY environment variable is not set");

  const ai = new GoogleGenAI({ apiKey });

  const checkedApiKey = apiKey;
  console.log(`[veo] Generating 4 segments (max ${MAX_PARALLEL} in parallel)…`);

  const indices: (0 | 1 | 2 | 3)[] = [0, 1, 2, 3];
  const results: string[] = new Array(4);

  // Simple semaphore: keep at most MAX_PARALLEL jobs in-flight at once
  let inFlight = 0;
  let nextIdx = 0;

  await new Promise<void>((resolve, reject) => {
    let settled = 0;

    function launch() {
      while (inFlight < MAX_PARALLEL && nextIdx < indices.length) {
        const i = indices[nextIdx++] as 0 | 1 | 2 | 3;
        inFlight++;
        withSegmentRetry(ai, checkedApiKey, plan, i, outDir, segmentDurationSec)
          .then((path) => {
            results[i] = path;
            inFlight--;
            settled++;
            if (settled === indices.length) resolve();
            else launch();
          })
          .catch((err) => {
            reject(err);
          });
      }
    }

    launch();
  });

  return results;
}
