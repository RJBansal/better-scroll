import { runManagedAgent } from "./managedAgent";
import {
  type PlannerResult,
  type ReelSeedInput,
  type Source,
  type VideoPlan,
  ValidationError,
  extractJson,
  validatePlan,
} from "./types";

// ---------------------------------------------------------------------------
// System instructions (parameterised by duration)
// ---------------------------------------------------------------------------

const VISUAL_GUIDANCE = `
Visual field guidance (CRITICAL — read before writing each segment's "visual"):
- Prefer INFOGRAPHIC-style visuals: animated charts rising, timelines scrolling, data points lighting up, diagrams assembling piece by piece, network graphs pulsing, side-by-side comparisons materialising on screen.
- When showing a concept or fact, SHOW it — e.g. "a glowing bar chart grows left to right, each bar labelled with a percentage, against a deep navy background" not "a dark room with abstract particles".
- Backgrounds must be SCENE-SPECIFIC to the topic: a rendered laboratory bench for science topics, a stylised city skyline at dusk for finance/business, a forest canopy time-lapse for ecology, a circuit-board close-up for technology — not a generic gradient or floating orbs.
- Combine foreground infographic elements with a purposeful background: "a translucent pie chart floats over a slow-motion aerial shot of farmland, slice labels fade in one by one".
- Use motion to carry information: numbers counting up, arrows animating, icons assembling, maps zooming.
- Reserve pure abstract visuals only when the topic is genuinely abstract (philosophy, emotion). For every factual claim, use a visual that could appear in a well-designed explainer video.`.trim();

function makeTimeRange(i: number, segSec: number): string {
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  return `${fmt(i * segSec)}-${fmt((i + 1) * segSec)}`;
}

function buildBaseSystemInstruction(totalSec: number, segSec: number): string {
  const wordsPerSeg = Math.round(segSec * 2); // ~2 words/sec
  const timeRanges = [0, 1, 2, 3].map((i) => `  Segment ${i}: ${makeTimeRange(i, segSec)}`).join("\n");
  return `You are a creative director and video script writer.
Given a topic, use Google Search to research accurate facts, then produce a cohesive storyboard for a ${totalSec}-second vertical (9:16) social media reel.

The reel is split into EXACTLY 4 segments of ${segSec} seconds each:
${timeRanges}

Rules:
- Each voiceover is ~${wordsPerSeg} words spoken at ~2 words/second — fits in ${segSec} seconds.
- All 4 segments share a CONTINUOUS rightward camera pan and a consistent dark palette with neon accents so the stitched video feels seamless.
- transitionOutCue of segment N must describe the exact shot that opens segment N+1 (transitionInCue of N+1).
- Do NOT describe real, named, or identifiable individuals — use abstract, symbolic, or generic human silhouettes only.
- Do NOT embed source URLs inside the JSON.
- styleGuide must cover: color palette, camera movement, lens style, on-screen text style, and music mood.
- IMPORTANT: The top-level JSON MUST include all four fields: title, styleGuide, music, and segments. Do not omit any.

${VISUAL_GUIDANCE}

Respond with TWO fenced code blocks in this exact order and nothing else:

1. A \`\`\`json block containing the VideoPlan matching this exact shape:
{
  "title": string,
  "styleGuide": string,
  "music": string,
  "segments": [
    {
      "index": 0,
      "timeRange": "${makeTimeRange(0, segSec)}",
      "title": string,
      "visual": string,
      "onScreenText": string,
      "voiceover": string,
      "transitionInCue": string,
      "transitionOutCue": string
    },
    ... (repeat for indices 1, 2, 3)
  ]
}

2. A \`\`\`json sources block containing:
{ "sources": [{ "title": string, "uri": string }], "searchQueries": [string] }

Put NOTHING after the sources block.`;
}

function buildSeedSystemInstruction(totalSec: number, segSec: number): string {
  const wordsPerSeg = Math.round(segSec * 2);
  return `You are a creative director turning a pre-decided Reel Seed into a 4-segment video storyboard.

Segment mapping (each segment is ${segSec} seconds, total ${totalSec} seconds):
- Segment 0 (${makeTimeRange(0, segSec)}): deliver the hook_angle exactly
- Segment 1 (${makeTimeRange(1, segSec)}): cover body_points[0] and body_points[1]
- Segment 2 (${makeTimeRange(2, segSec)}): cover body_points[2] (and body_points[3] if present)
- Segment 3 (${makeTimeRange(3, segSec)}): land the call_to_action

Additional rules:
- styleGuide MUST incorporate the seed's visual_direction_notes.
- Voiceovers must match the seed's metadata.tone and metadata.pacing.
- Each voiceover is ~${wordsPerSeg} words at ~2 words/second — fits in ${segSec} seconds.
- Continuous rightward camera pan across all 4 segments.
- transitionOutCue of segment N must match transitionInCue of segment N+1.
- Do NOT describe real, named, or identifiable individuals.
- Use Google Search to ground any factual claims referenced in the seed's source_references.
- IMPORTANT: The top-level JSON MUST include all four fields: title, styleGuide, music, and segments. Do not omit any.

${VISUAL_GUIDANCE}

Respond with TWO fenced code blocks in this exact order and nothing else:

1. A \`\`\`json block with the VideoPlan (same schema as the base planner).
2. A \`\`\`json sources block: { "sources": [{ "title": string, "uri": string }], "searchQueries": [string] }

Put NOTHING after the sources block.`;
}

const REPAIR_PROMPT = (original: string, errMsg: string) =>
  `The following text should contain a video plan JSON but it is malformed or missing required fields.
Validation failed with: "${errMsg}".
Reformat it into the exact JSON shape described in the system instruction, ensuring ALL four top-level fields (title, styleGuide, music, segments) are present.
Return ONLY the fenced \`\`\`json code block with the VideoPlan — nothing else.

--- ORIGINAL TEXT ---
${original}`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractSourcesBlock(text: string): { sources: Source[]; searchQueries: string[] } {
  // Find the last ```json block — that's the sources block by convention
  const allFenced = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)];
  if (allFenced.length < 2) return { sources: [], searchQueries: [] };

  const lastBlock = allFenced[allFenced.length - 1];
  if (!lastBlock?.[1]) return { sources: [], searchQueries: [] };

  try {
    const parsed = JSON.parse(lastBlock[1].trim()) as Record<string, unknown>;
    const rawSources = (parsed["sources"] ?? []) as Array<Record<string, unknown>>;
    const sources: Source[] = rawSources
      .filter((s) => s["uri"])
      .map((s) => ({ title: String(s["title"] ?? s["uri"]), uri: String(s["uri"]) }));
    const searchQueries = ((parsed["searchQueries"] ?? []) as unknown[])
      .filter((q): q is string => typeof q === "string");
    return { sources, searchQueries };
  } catch {
    return { sources: [], searchQueries: [] };
  }
}

function extractPlanBlock(text: string): unknown {
  // Take the FIRST fenced JSON block (the plan), not the last (sources)
  const allFenced = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)];
  if (allFenced.length === 0) return extractJson(text);

  for (const match of allFenced) {
    if (!match[1]) continue;
    try {
      const parsed: unknown = JSON.parse(match[1].trim());
      // Skip the sources block shape { sources, searchQueries }
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "segments" in parsed
      ) {
        return parsed;
      }
    } catch {
      // try next
    }
  }
  return extractJson(text);
}

async function runPlannerAgent(
  systemInstruction: string,
  input: string,
  topic: string,
  segmentDurationSec: number,
): Promise<PlannerResult & { topic: string }> {
  console.log(`[planner] Calling managed agent for: "${topic}"…`);
  const result = await runManagedAgent({ input, systemInstruction });
  const rawText = result.outputText;

  const { sources, searchQueries } = extractSourcesBlock(rawText);
  console.log(`[planner] Got ${sources.length} sources, ${searchQueries.length} search queries`);

  let plan: VideoPlan | null = null;
  const parsed = extractPlanBlock(rawText);

  try {
    plan = validatePlan(parsed, topic, segmentDurationSec);
    console.log("[planner] JSON parsed and validated successfully");
  } catch (err) {
    const msg = err instanceof ValidationError ? err.message : "JSON extraction failed";
    console.warn(`[planner] ${msg}, attempting repair…`);

    const repairResult = await runManagedAgent({
      input: REPAIR_PROMPT(rawText, msg),
      systemInstruction,
    });
    const reparsed = extractPlanBlock(repairResult.outputText);
    plan = validatePlan(reparsed, topic, segmentDurationSec);
    console.log("[planner] JSON repaired and validated");
  }

  return { topic, plan, sources, searchQueries, rawText };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function planReel(topic: string, reelDurationSec = 32): Promise<PlannerResult> {
  const segSec = Math.max(5, Math.round(reelDurationSec / 4));
  const totalSec = segSec * 4;
  const input = `Create a ${totalSec}-second vertical reel storyboard for the topic: "${topic}"`;
  return runPlannerAgent(buildBaseSystemInstruction(totalSec, segSec), input, topic, segSec);
}

export async function planReelFromSeed(
  seed: ReelSeedInput,
  reelDurationSec = 32,
): Promise<PlannerResult> {
  const segSec = Math.max(5, Math.round(reelDurationSec / 4));
  const totalSec = segSec * 4;
  const topic = seed.reel_id ?? seed.topic_focus;
  const input = `Convert this Reel Seed into a ${totalSec}-second 4-segment storyboard:\n\n${JSON.stringify(seed, null, 2)}`;
  return runPlannerAgent(buildSeedSystemInstruction(totalSec, segSec), input, topic, segSec);
}
