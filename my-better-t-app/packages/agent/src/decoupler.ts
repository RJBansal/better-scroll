import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { extractJson, runManagedAgent } from "@my-better-t-app/video";
import type { ReelSeed, UserProfile } from "./types.js";

const SEED_KEYS: (keyof ReelSeed)[] = [
  "reel_id",
  "category",
  "topic_focus",
  "core_narrative_arc",
  "metadata",
  "visual_direction_notes",
];

const ARC_KEYS = ["hook_angle", "body_points", "call_to_action"] as const;
const META_KEYS = ["tone", "pacing", "source_references"] as const;

function buildSystemInstruction(n: number): string {
  return `You are an expert content producer and narrative strategist.

Your job is to read the "Daily Massive Read-Up" document for the user, evaluate their current state and profile, and extract EXACTLY ${n} distinct, high-impact "Reel Seeds" that will be passed downstream to a video scriptwriter and video generator.

GUIDELINES:
- Diverse Categories: The ${n} reels MUST cover different areas. Suggested spread:
  ${n >= 1 ? "• 1 reel: Goal Motivation (tied to an active goal)" : ""}
  ${n >= 2 ? "• 1 reel: Hobby News or Tutorial (tied to a hobby or YouTube history item)" : ""}
  ${n >= 3 ? "• 1 reel: Exploratory Discovery (adjacent or unexpected insight)" : ""}
  Extra reels if N > 3: mix from the above categories.
- Actionability: Every reel must feel personally relevant. Do NOT output generic advice.
- body_points: 2-4 concrete beats. Keep each under 15 words.
- visual_direction_notes: describe palette, setting, and aesthetic direction for the Veo video generator.
- reel_id format: reel_YYYYMMDD_<slug> (use today's date).
- source_references: pull relevant titles from the read-up's sources section.

Output ONLY a single fenced \`\`\`json block — a JSON array of EXACTLY ${n} objects, no prose outside it.

Each object must match EXACTLY this shape:
{
  "reel_id": string,
  "category": string,
  "topic_focus": string,
  "core_narrative_arc": {
    "hook_angle": string,
    "body_points": [string, ...],
    "call_to_action": string
  },
  "metadata": {
    "tone": string,
    "pacing": string,
    "source_references": [string, ...]
  },
  "visual_direction_notes": string
}`;
}

const REPAIR_PROMPT = (n: number, original: string) =>
  `The following text should contain a JSON array of ${n} Reel Seed objects but is malformed or missing required fields.
Reformat it into the exact shape described in the system instruction.
Return ONLY the fenced \`\`\`json array — nothing else.

--- ORIGINAL TEXT ---
${original}`;

function validateSeeds(raw: unknown, n: number): ReelSeed[] {
  if (!Array.isArray(raw)) throw new Error("Expected a JSON array of seeds");
  if (raw.length !== n) throw new Error(`Expected ${n} seeds, got ${raw.length}`);

  return raw.map((item, i) => {
    if (typeof item !== "object" || item === null)
      throw new Error(`Seed ${i} is not an object`);
    const obj = item as Record<string, unknown>;

    for (const key of SEED_KEYS) {
      if (!(key in obj)) throw new Error(`Seed ${i} missing key: ${key}`);
    }

    const arc = obj["core_narrative_arc"] as Record<string, unknown>;
    for (const k of ARC_KEYS) {
      if (!(k in arc)) throw new Error(`Seed ${i} core_narrative_arc missing: ${k}`);
    }

    const meta = obj["metadata"] as Record<string, unknown>;
    for (const k of META_KEYS) {
      if (!(k in meta)) throw new Error(`Seed ${i} metadata missing: ${k}`);
    }

    return obj as unknown as ReelSeed;
  });
}

export async function decoupleReels(
  profile: UserProfile,
  readUpMarkdown: string,
  n: number,
  outDir: string,
): Promise<ReelSeed[]> {
  console.log(`[decoupler] Extracting ${n} Reel Seeds from read-up…`);

  const systemInstruction = buildSystemInstruction(n);
  const input = `USER PROFILE:\n${JSON.stringify(profile, null, 2)}\n\n---\n\nDAILY MASSIVE READ-UP:\n${readUpMarkdown}\n\n---\n\nExtract exactly ${n} Reel Seeds now.`;

  const result = await runManagedAgent({ input, systemInstruction });
  const rawText = result.outputText;

  let seeds: ReelSeed[];
  try {
    const parsed = extractJson(rawText);
    seeds = validateSeeds(parsed, n);
    console.log(`[decoupler] Parsed ${seeds.length} seeds successfully`);
  } catch (err) {
    console.warn(`[decoupler] Parse failed (${err instanceof Error ? err.message : err}), attempting repair…`);

    const repairResult = await runManagedAgent({
      input: REPAIR_PROMPT(n, rawText),
      systemInstruction,
    });
    const reparsed = extractJson(repairResult.outputText);
    seeds = validateSeeds(reparsed, n);
    console.log("[decoupler] Seeds repaired and validated");
  }

  await writeFile(join(outDir, "reel_seeds.json"), JSON.stringify(seeds, null, 2), "utf8");
  return seeds;
}
