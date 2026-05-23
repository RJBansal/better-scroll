import { runManagedAgent } from "./managedAgent.js";
import {
  type PlannerResult,
  type ReelSeedInput,
  type Source,
  type VideoPlan,
  ValidationError,
  extractJson,
  validatePlan,
} from "./types.js";

// ---------------------------------------------------------------------------
// System instructions
// ---------------------------------------------------------------------------

const BASE_SYSTEM_INSTRUCTION = `You are a creative director and video script writer.
Given a topic, use Google Search to research accurate facts, then produce a cohesive storyboard for a 32-second vertical (9:16) social media reel.

The reel is split into EXACTLY 4 segments of 8 seconds each:
  Segment 0: 0:00-0:08
  Segment 1: 0:08-0:16
  Segment 2: 0:16-0:24
  Segment 3: 0:24-0:32

Rules:
- Each voiceover is ~14-18 words spoken at ~2 words/second — fits in 8 seconds.
- All 4 segments share a CONTINUOUS rightward camera pan and a consistent dark palette with neon accents so the stitched video feels seamless.
- transitionOutCue of segment N must describe the exact shot that opens segment N+1 (transitionInCue of N+1).
- Do NOT describe real, named, or identifiable individuals — use abstract, symbolic, or generic human silhouettes only.
- Do NOT embed source URLs inside the JSON.
- styleGuide must cover: color palette, camera movement, lens style, on-screen text style, and music mood.

Respond with TWO fenced code blocks in this exact order and nothing else:

1. A \`\`\`json block containing the VideoPlan matching this exact shape:
{
  "title": string,
  "styleGuide": string,
  "music": string,
  "segments": [
    {
      "index": 0,
      "timeRange": "0:00-0:08",
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

const SEED_SYSTEM_INSTRUCTION = `You are a creative director turning a pre-decided Reel Seed into a 4-segment video storyboard.

Segment mapping:
- Segment 0 (0:00-0:08): deliver the hook_angle exactly
- Segment 1 (0:08-0:16): cover body_points[0] and body_points[1]
- Segment 2 (0:16-0:24): cover body_points[2] (and body_points[3] if present)
- Segment 3 (0:24-0:32): land the call_to_action

Additional rules:
- styleGuide MUST incorporate the seed's visual_direction_notes.
- Voiceovers must match the seed's metadata.tone and metadata.pacing.
- Each voiceover is ~14-18 words at ~2 words/second.
- Continuous rightward camera pan across all 4 segments.
- transitionOutCue of segment N must match transitionInCue of segment N+1.
- Do NOT describe real, named, or identifiable individuals.
- Use Google Search to ground any factual claims referenced in the seed's source_references.

Respond with TWO fenced code blocks in this exact order and nothing else:

1. A \`\`\`json block with the VideoPlan (same schema as the base planner).
2. A \`\`\`json sources block: { "sources": [{ "title": string, "uri": string }], "searchQueries": [string] }

Put NOTHING after the sources block.`;

const REPAIR_PROMPT = (original: string) =>
  `The following text should contain a video plan JSON but it is malformed or missing required fields.
Reformat it into the exact JSON shape described in the system instruction.
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
): Promise<PlannerResult & { topic: string }> {
  console.log(`[planner] Calling managed agent for: "${topic}"…`);
  const result = await runManagedAgent({ input, systemInstruction });
  const rawText = result.outputText;

  const { sources, searchQueries } = extractSourcesBlock(rawText);
  console.log(`[planner] Got ${sources.length} sources, ${searchQueries.length} search queries`);

  let plan: VideoPlan | null = null;
  const parsed = extractPlanBlock(rawText);

  try {
    plan = validatePlan(parsed);
    console.log("[planner] JSON parsed and validated successfully");
  } catch (err) {
    const msg = err instanceof ValidationError ? err.message : "JSON extraction failed";
    console.warn(`[planner] ${msg}, attempting repair…`);

    const repairResult = await runManagedAgent({
      input: REPAIR_PROMPT(rawText),
      systemInstruction,
    });
    const reparsed = extractPlanBlock(repairResult.outputText);
    plan = validatePlan(reparsed);
    console.log("[planner] JSON repaired and validated");
  }

  return { topic, plan, sources, searchQueries, rawText };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function planReel(topic: string): Promise<PlannerResult> {
  const input = `Create a 32-second vertical reel storyboard for the topic: "${topic}"`;
  return runPlannerAgent(BASE_SYSTEM_INSTRUCTION, input, topic);
}

export async function planReelFromSeed(seed: ReelSeedInput): Promise<PlannerResult> {
  const topic = seed.reel_id ?? seed.topic_focus;
  const input = `Convert this Reel Seed into a 4-segment storyboard:\n\n${JSON.stringify(seed, null, 2)}`;
  return runPlannerAgent(SEED_SYSTEM_INSTRUCTION, input, topic);
}
