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

const SEGMENT_TIME_RANGES: VideoSegment["timeRange"][] = [
  "0:00-0:08",
  "0:08-0:16",
  "0:16-0:24",
  "0:24-0:32",
];

const DEFAULT_STYLE_GUIDE =
  "Dark palette with neon accents, continuous rightward pan, cinematic vertical 9:16.";
const DEFAULT_MUSIC = "Ambient electronic, low BPM, building energy.";

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

export function validatePlan(raw: unknown, fallbackTopic = "Untitled"): VideoPlan {
  if (typeof raw !== "object" || raw === null) {
    throw new ValidationError("Parsed value is not an object");
  }
  const obj = raw as Record<string, unknown>;

  // segments is the only field we can't synthesize — keep strict
  if (!Array.isArray(obj["segments"]) || obj["segments"].length !== 4) {
    throw new ValidationError("segments must be an array of exactly 4 items");
  }

  const rawSegs = obj["segments"] as unknown[];
  const builtSegments = rawSegs.map((rawSeg, i) => {
    if (typeof rawSeg !== "object" || rawSeg === null) {
      throw new ValidationError(`Segment ${i} is not an object`);
    }
    const seg = rawSeg as Record<string, unknown>;

    // visual is the only field we cannot synthesize — it is the entire Veo prompt
    if (typeof seg["visual"] !== "string" || !(seg["visual"] as string).trim()) {
      throw new ValidationError(`Segment ${i} missing or empty: visual`);
    }

    const idx = (typeof seg["index"] === "number" ? seg["index"] : i) as 0 | 1 | 2 | 3;

    return {
      index: idx,
      timeRange: typeof seg["timeRange"] === "string"
        ? (seg["timeRange"] as VideoSegment["timeRange"])
        : SEGMENT_TIME_RANGES[idx] ?? SEGMENT_TIME_RANGES[i] ?? "0:00-0:08",
      title: typeof seg["title"] === "string" ? (seg["title"] as string) : `Segment ${i + 1}`,
      visual: seg["visual"] as string,
      onScreenText: typeof seg["onScreenText"] === "string" ? (seg["onScreenText"] as string) : "",
      voiceover: typeof seg["voiceover"] === "string" ? (seg["voiceover"] as string) : "",
      transitionInCue: typeof seg["transitionInCue"] === "string" ? (seg["transitionInCue"] as string) : "",
      transitionOutCue: typeof seg["transitionOutCue"] === "string" ? (seg["transitionOutCue"] as string) : "",
    } satisfies VideoSegment;
  }) as [VideoSegment, VideoSegment, VideoSegment, VideoSegment];

  return {
    title: typeof obj["title"] === "string" ? (obj["title"] as string) : fallbackTopic,
    styleGuide:
      typeof obj["styleGuide"] === "string"
        ? (obj["styleGuide"] as string)
        : DEFAULT_STYLE_GUIDE,
    music: typeof obj["music"] === "string" ? (obj["music"] as string) : DEFAULT_MUSIC,
    segments: builtSegments,
  };
}
