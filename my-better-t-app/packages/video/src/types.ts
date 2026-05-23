export interface VideoSegment {
  index: 0 | 1 | 2 | 3;
  timeRange: "0:00-0:08" | "0:08-0:16" | "0:16-0:24" | "0:24-0:32";
  title: string;
  /** Detailed Veo-ready visual description */
  visual: string;
  /** Short text overlay for the video */
  onScreenText: string;
  /** ~14-18 words at ~2 wps — fits comfortably in 8 seconds */
  voiceover: string;
  /** What this segment's shot opens on (must match prior segment's transitionOutCue) */
  transitionInCue: string;
  /** What shot to end on so the next segment can open seamlessly */
  transitionOutCue: string;
}

export interface VideoPlan {
  title: string;
  /** Shared visual language injected into every Veo prompt: palette, camera moves, mood, lens */
  styleGuide: string;
  /** Background music description */
  music: string;
  segments: [VideoSegment, VideoSegment, VideoSegment, VideoSegment];
}

export interface Source {
  title: string;
  uri: string;
}

export interface PlannerResult {
  topic: string;
  plan: VideoPlan;
  sources: Source[];
  searchQueries: string[];
  /** Raw Flash response text kept for debugging */
  rawText: string;
}

// ---------------------------------------------------------------------------
// Tolerant JSON extractor
// ---------------------------------------------------------------------------

/** Required keys on each segment object */
const SEGMENT_KEYS: (keyof VideoSegment)[] = [
  "index",
  "timeRange",
  "title",
  "visual",
  "onScreenText",
  "voiceover",
  "transitionInCue",
  "transitionOutCue",
];

/** Required keys on the root plan object */
const PLAN_KEYS: (keyof VideoPlan)[] = ["title", "styleGuide", "music", "segments"];

function findBalancedJson(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

export function extractJson(text: string): unknown {
  // 1. Try fenced ```json ... ``` or ``` ... ```
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      // fall through
    }
  }
  // 2. Try first balanced {...} block
  const balanced = findBalancedJson(text);
  if (balanced) {
    try {
      return JSON.parse(balanced);
    } catch {
      // fall through
    }
  }
  return null;
}

export class ValidationError extends Error {}

// ---------------------------------------------------------------------------
// Reel Seed (consumed by planReelFromSeed — kept standalone so packages/video
// has no dependency on packages/agent)
// ---------------------------------------------------------------------------

export interface ReelSeedInput {
  reel_id?: string;
  topic_focus: string;
  core_narrative_arc: {
    hook_angle: string;
    body_points: string[];
    call_to_action: string;
  };
  metadata?: {
    tone?: string;
    pacing?: string;
    source_references?: string[];
  };
  visual_direction_notes?: string;
}

export function validatePlan(raw: unknown): VideoPlan {
  if (typeof raw !== "object" || raw === null) {
    throw new ValidationError("Parsed value is not an object");
  }
  const obj = raw as Record<string, unknown>;

  for (const key of PLAN_KEYS) {
    if (!(key in obj)) throw new ValidationError(`Missing required key: ${key}`);
  }

  if (!Array.isArray(obj["segments"]) || obj["segments"].length !== 4) {
    throw new ValidationError("segments must be an array of exactly 4 items");
  }

  const segments = obj["segments"] as unknown[];
  for (let i = 0; i < 4; i++) {
    const seg = segments[i] as Record<string, unknown>;
    if (typeof seg !== "object" || seg === null) {
      throw new ValidationError(`Segment ${i} is not an object`);
    }
    for (const key of SEGMENT_KEYS) {
      if (!(key in seg)) throw new ValidationError(`Segment ${i} missing key: ${key}`);
    }
  }

  return obj as unknown as VideoPlan;
}
