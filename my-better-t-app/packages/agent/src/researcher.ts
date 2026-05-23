import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { runManagedAgent } from "@my-better-t-app/video";
import type { ResearchResult, UserProfile } from "./types";

const SYSTEM_INSTRUCTION = `You are a daily research manager for a personalized content system.

Given a user profile (goals, hobbies, YouTube history, bookmarks, notes), use Google Search to find fresh, specific, and actionable information from 2026 that is directly tied to each profile item. Do not produce generic content.

Structure your output as a Markdown document called the "Daily Massive Read-Up" with these four sections:
1. ## Daily Focus & Motivation
   - Personalized encouragement tied to the user's current goals and notes
   - One actionable micro-step they can take today
2. ## Hobby Updates
   - Fresh news, tutorials, community discussions, or tools matching their hobbies and YouTube history
3. ## Exploratory Discoveries
   - Adjacent or unexpected topics that connect two or more of their interests
4. ## News & Events
   - Relevant news, local or global, that connects to any goal or hobby

Rules:
- Every claim must trace back to a specific profile item.
- Be specific: cite names, dates, and concrete facts from your searches.
- Write in second person ("You", "Your goal").
- Keep total length under 1200 words.

After the Markdown, add EXACTLY this separator line:
---SOURCES---

Then output a single fenced \`\`\`json block containing ONLY:
{ "sources": [{ "title": string, "uri": string }], "searchQueries": [string] }

Put NOTHING after that JSON block.`;

function splitReadUpAndSources(outputText: string): {
  readUpMarkdown: string;
  sourcesRaw: string;
} {
  const separator = "---SOURCES---";
  const idx = outputText.lastIndexOf(separator);
  if (idx === -1) {
    // Fallback: look for the last fenced block and treat everything before it as markdown
    const lastFenced = outputText.lastIndexOf("```");
    const firstFenced = outputText.indexOf("```");
    if (lastFenced !== firstFenced) {
      return {
        readUpMarkdown: outputText.slice(0, outputText.lastIndexOf("```json")).trim(),
        sourcesRaw: outputText.slice(outputText.lastIndexOf("```json")),
      };
    }
    return { readUpMarkdown: outputText.trim(), sourcesRaw: "" };
  }
  return {
    readUpMarkdown: outputText.slice(0, idx).trim(),
    sourcesRaw: outputText.slice(idx + separator.length).trim(),
  };
}

function parseSources(sourcesRaw: string): { sources: ResearchResult["sources"]; searchQueries: string[] } {
  const match = /```(?:json)?\s*([\s\S]*?)```/.exec(sourcesRaw);
  if (!match?.[1]) return { sources: [], searchQueries: [] };
  try {
    const parsed = JSON.parse(match[1].trim()) as Record<string, unknown>;
    const rawSrc = (parsed["sources"] ?? []) as Array<Record<string, unknown>>;
    const sources = rawSrc
      .filter((s) => s["uri"])
      .map((s) => ({ title: String(s["title"] ?? s["uri"]), uri: String(s["uri"]) }));
    const searchQueries = ((parsed["searchQueries"] ?? []) as unknown[])
      .filter((q): q is string => typeof q === "string");
    return { sources, searchQueries };
  } catch {
    return { sources: [], searchQueries: [] };
  }
}

export async function runResearcher(
  profile: UserProfile,
  outDir: string,
): Promise<ResearchResult> {
  console.log(`[researcher] Starting daily research for ${profile.name}…`);

  const input = `Here is the user profile for today's research:\n\n${JSON.stringify(profile, null, 2)}\n\nProduce the Daily Massive Read-Up now.`;

  const result = await runManagedAgent({ input, systemInstruction: SYSTEM_INSTRUCTION });
  const { readUpMarkdown, sourcesRaw } = splitReadUpAndSources(result.outputText);
  const { sources, searchQueries } = parseSources(sourcesRaw);

  console.log(`[researcher] Read-up: ${readUpMarkdown.length} chars, ${sources.length} sources, ${searchQueries.length} queries`);

  await writeFile(join(outDir, "read_up.md"), readUpMarkdown, "utf8");
  await writeFile(
    join(outDir, "research.json"),
    JSON.stringify({ sources, searchQueries, interactionId: result.interactionId }, null, 2),
    "utf8",
  );

  return { readUpMarkdown, sources, searchQueries };
}
