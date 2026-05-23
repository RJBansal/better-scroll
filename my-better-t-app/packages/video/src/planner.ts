import { type Tool, GoogleGenAI } from "@google/genai";
import {
  type PlannerResult,
  type Source,
  type VideoPlan,
  ValidationError,
  extractJson,
  validatePlan,
} from "./types.js";

const SYSTEM_INSTRUCTION = `You are a creative director and video script writer.
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
- Do NOT describe real, named, or identifiable individuals — use abstract, symbolic, or generic human silhouettes only. Fictional or anonymous figures are fine.
- Do NOT embed source URLs inside the JSON — factual grounding is done via Google Search.
- styleGuide must cover: color palette, camera movement, lens style, on-screen text style, and music mood.

Respond with ONLY a single fenced \`\`\`json code block — no prose before or after it.

The JSON must match this exact shape:
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
}`;

const REPAIR_PROMPT = (original: string) =>
  `The following text should contain a video plan JSON but it is malformed or missing fields.
Reformat it into the exact JSON shape shown in the system instruction.
Return ONLY the fenced \`\`\`json code block — nothing else.

--- ORIGINAL TEXT ---
${original}`;

async function callFlash(
  ai: GoogleGenAI,
  userMessage: string,
  grounded: boolean,
): Promise<{ text: string; rawCandidate: unknown }> {
  const tools: Tool[] = grounded ? [{ googleSearch: {} }] : [];

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      thinkingConfig: { thinkingBudget: 1024 },
      tools: tools.length > 0 ? tools : undefined,
    },
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
  });

  const candidate = response.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  return { text, rawCandidate: candidate };
}

function extractSources(rawCandidate: unknown): { sources: Source[]; searchQueries: string[] } {
  const candidate = rawCandidate as Record<string, unknown> | null;
  if (!candidate) return { sources: [], searchQueries: [] };

  const meta = candidate["groundingMetadata"] as Record<string, unknown> | undefined;
  if (!meta) return { sources: [], searchQueries: [] };

  const chunks = (meta["groundingChunks"] ?? []) as Array<Record<string, unknown>>;
  const seenUris = new Set<string>();
  const sources: Source[] = [];

  for (const chunk of chunks) {
    const web = chunk["web"] as Record<string, unknown> | undefined;
    if (!web) continue;
    const uri = String(web["uri"] ?? "");
    const title = String(web["title"] ?? uri);
    if (uri && !seenUris.has(uri)) {
      seenUris.add(uri);
      sources.push({ title, uri });
    }
  }

  const queries = ((meta["webSearchQueries"] ?? []) as string[]).filter(Boolean);
  return { sources, searchQueries: queries };
}

export async function planReel(topic: string): Promise<PlannerResult> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) throw new Error("GEMINI_API_KEY environment variable is not set");

  const ai = new GoogleGenAI({ apiKey });

  const userMessage = `Create a 32-second vertical reel storyboard for the topic: "${topic}"`;

  console.log(`[planner] Calling Gemini Flash with Google Search grounding for: "${topic}"…`);
  const { text: rawText, rawCandidate } = await callFlash(ai, userMessage, true);
  const { sources, searchQueries } = extractSources(rawCandidate);

  console.log(`[planner] Got ${sources.length} sources, ${searchQueries.length} search queries`);

  let plan: VideoPlan | null = null;

  // First parse attempt
  const parsed = extractJson(rawText);
  try {
    plan = validatePlan(parsed);
    console.log("[planner] JSON parsed and validated successfully");
  } catch (err) {
    if (err instanceof ValidationError) {
      console.warn(`[planner] Validation failed (${err.message}), attempting repair…`);
    } else {
      console.warn("[planner] JSON extraction failed, attempting repair…");
    }

    // One repair retry — no grounding this time, just formatting
    const { text: repairedText } = await callFlash(ai, REPAIR_PROMPT(rawText), false);
    const reparsed = extractJson(repairedText);
    plan = validatePlan(reparsed); // throws ValidationError if still broken
    console.log("[planner] JSON repaired and validated");
  }

  return {
    topic,
    plan,
    sources,
    searchQueries,
    rawText,
  };
}
